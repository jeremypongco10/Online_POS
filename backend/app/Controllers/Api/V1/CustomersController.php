<?php

namespace App\Controllers\Api\V1;

use App\Controllers\Api\BaseCrudController;
use App\Models\CompanyModel;
use App\Models\CustomerModel;
use App\Models\LoyaltyCardModel;
use App\Models\LoyaltyPointTransactionModel;
use App\Models\UserModel;
use Config\Services;

class CustomersController extends BaseCrudController
{
    protected string $modelClass = CustomerModel::class;
    // customer_code carries a unique index (per company), so an exact-match filter on it — used by the
    // POS Customer dialog's quick-attach-by-number flow — can never return more than one row.
    protected array $allowedFilters = ['company_id', 'is_active', 'customer_code'];
    protected array $allowedSorts = ['id', 'name', 'customer_code', 'created_at'];
    protected array $searchableFields = ['name', 'customer_code', 'email', 'mobile'];
    protected string $defaultSort = 'name';

    /**
     * Every new customer gets a loyalty card issued immediately (0
     * points) so the Points column never sits in a "no card yet" state —
     * best-effort, same reasoning as StoresController::create()'s
     * auto-grant: the customer itself is already created successfully by
     * this point, so a bug here must never turn that into an error.
     */
    public function create()
    {
        $response = parent::create();
        $body = json_decode($response->getBody(), true);

        if (($body['success'] ?? false) && isset($body['data']['id'])) {
            try {
                model(LoyaltyCardModel::class)->firstOrCreateForCustomer((int) $body['data']['id']);
            } catch (\Throwable $e) {
                log_message('error', 'Failed to auto-issue loyalty card for new customer: {msg}', ['msg' => $e->getMessage()]);
            }
        }

        return $response;
    }

    /** Most rows one export or printout fetches (?all=1). */
    private const EXPORT_LIMIT = 10000;

    /** "Lapsed": bought before, but nothing in this many days. */
    private const LAPSED_DAYS = 90;

    /**
     * GET /api/v1/customers/directory — the Back Office customer list, each
     * row carrying what the business knows about them: visits, total spent,
     * last visit, and (when loyalty is on and the caller may see it) points.
     * The plain index() above stays as it is for the POS customer lookup.
     *
     * Filters: q (name, number, email, mobile, card number), is_active,
     * segment = new | with_points | never_bought | lapsed. Sort: name
     * (default), customer_code, points, spent, visits, last_visit,
     * created_at. ?all=1 for exports and printouts.
     */
    public function directory()
    {
        $showPoints = $this->loyaltyVisible();
        $builder = $this->directoryQuery($showPoints)
            ->select('c.id, c.customer_code, c.first_name, c.last_name, c.name, c.email, c.mobile, c.address, c.is_active, c.created_at, '
                . 'lc.card_number, COALESCE(st.visits, 0) AS visits, COALESCE(st.spent, 0) AS bought, COALESCE(rf.refunded, 0) AS refunded, '
                . 'COALESCE(st.spent, 0) - COALESCE(rf.refunded, 0) AS spent, st.last_visit'
                . ($showPoints ? ', COALESCE(pt.points, 0) AS points' : ', NULL AS points'), false);

        if ($this->request->getGet('all') === '1') {
            [$perPage, $page] = [self::EXPORT_LIMIT, 1];
        } else {
            $perPage = max(1, min((int) ($this->request->getGet('per_page') ?? 15), 100));
            $page = max(1, (int) ($this->request->getGet('page') ?? 1));
        }
        $total = $builder->countAllResults(false);

        $sortParam = (string) $this->request->getGet('sort');
        $key = ltrim($sortParam, '-');
        $direction = str_starts_with($sortParam, '-') ? 'DESC' : 'ASC';
        $column = match ($key) {
            'customer_code' => 'c.customer_code',
            'points' => $showPoints ? 'points' : 'c.name',
            'spent' => 'spent',
            'visits' => 'visits',
            'last_visit' => 'st.last_visit',
            'created_at' => 'c.created_at',
            default => 'c.name',
        };
        $rows = $builder->orderBy($column, $direction)->orderBy('c.id', 'ASC')->get($perPage, ($page - 1) * $perPage)->getResult();

        return $this->ok($rows, '', [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => (int) ceil($total / $perPage) ?: 1,
            'points_visible' => $showPoints,
        ]);
    }

    /** GET /api/v1/customers/directory/summary — the cards above the list (search applied, segment and status not). */
    public function directorySummary()
    {
        $showPoints = $this->loyaltyVisible();
        $monthStart = date('Y-m-01 00:00:00');
        $lapsedBefore = date('Y-m-d H:i:s', strtotime('-' . self::LAPSED_DAYS . ' days'));

        $row = $this->directoryQuery($showPoints, false)
            ->select("COUNT(*) AS total, "
                . "COALESCE(SUM(CASE WHEN c.is_active = 1 THEN 1 ELSE 0 END), 0) AS active, "
                . "COALESCE(SUM(CASE WHEN c.is_active = 1 THEN 0 ELSE 1 END), 0) AS inactive, "
                . "COALESCE(SUM(CASE WHEN c.created_at >= " . $this->db()->escape($monthStart) . " THEN 1 ELSE 0 END), 0) AS new_this_month, "
                . "COALESCE(SUM(CASE WHEN st.visits IS NULL THEN 1 ELSE 0 END), 0) AS never_bought, "
                . "COALESCE(SUM(CASE WHEN st.last_visit < " . $this->db()->escape($lapsedBefore) . " THEN 1 ELSE 0 END), 0) AS lapsed, "
                . "COALESCE(SUM(st.spent), 0) - COALESCE(SUM(rf.refunded), 0) AS spent_total, COALESCE(SUM(rf.refunded), 0) AS refunded_total"
                . ($showPoints
                    ? ", COALESCE(SUM(CASE WHEN pt.points > 0 THEN 1 ELSE 0 END), 0) AS with_points, COALESCE(SUM(CASE WHEN pt.points > 0 THEN pt.points ELSE 0 END), 0) AS points_outstanding"
                    : ', 0 AS with_points, 0 AS points_outstanding'), false)
            ->get()->getRow();

        $company = model(CompanyModel::class)->find(Services::authContext()->companyId);

        return $this->ok([
            'total' => (int) $row->total,
            'active' => (int) $row->active,
            'inactive' => (int) $row->inactive,
            'new_this_month' => (int) $row->new_this_month,
            'never_bought' => (int) $row->never_bought,
            'lapsed' => (int) $row->lapsed,
            'lapsed_days' => self::LAPSED_DAYS,
            'spent_total' => (string) $row->spent_total,
            'refunded_total' => (string) $row->refunded_total,
            'with_points' => (int) $row->with_points,
            'points_outstanding' => (int) $row->points_outstanding,
            'points_visible' => $showPoints,
            'company_name' => $company->trade_name ?? null,
        ]);
    }

    /** GET /api/v1/customers/{id}/purchases — their latest completed sales, newest first. */
    public function purchases($id = null)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }

        $auth = Services::authContext();
        $builder = $this->db()->table('sales sa')
            ->select('sa.id, sa.invoice_number, sa.sale_date, sa.total, s.name AS store_name, '
                . '(SELECT COALESCE(SUM(si.quantity), 0) FROM sale_items si WHERE si.sale_id = sa.id) AS units, '
                . "(SELECT COALESCE(SUM(r.total_refund), 0) FROM returns r WHERE r.sale_id = sa.id AND r.status = 'completed') AS refunded", false)
            ->join('stores s', 's.id = sa.store_id', 'left')
            ->where('sa.company_id', $auth->companyId)
            ->where('sa.customer_id', (int) $id)
            ->where('sa.status', 'completed')
            ->where('sa.is_training', 0);
        if ($auth->allowedStoreIds !== null) {
            $builder->whereIn('sa.store_id', $auth->allowedStoreIds ?: [0]);
        }

        return $this->ok($builder->orderBy('sa.sale_date', 'DESC')->limit(10)->get()->getResult());
    }

    private function db(): \CodeIgniter\Database\BaseConnection
    {
        return \Config\Database::connect();
    }

    /** Points are shown only when the company runs loyalty and the caller holds loyalty.view — same rule as attachPoints(). */
    private function loyaltyVisible(): bool
    {
        $auth = Services::authContext();
        if (! in_array('loyalty.view', $auth->permissions, true)) {
            return false;
        }
        $company = model(CompanyModel::class)->find($auth->companyId);

        return $company && (int) ($company->loyalty_enabled ?? 1) === 1;
    }

    /**
     * customers with their purchase stats (completed, non-training sales)
     * and points balance joined on, scoped to the caller's company, with
     * the request's filters. $withSegment false leaves the status and
     * segment filters off, for the summary cards.
     */
    private function directoryQuery(bool $showPoints, bool $withSegment = true): \CodeIgniter\Database\BaseBuilder
    {
        $db = $this->db();
        $companyId = (int) Services::authContext()->companyId;
        $get = fn (string $key) => trim((string) ($this->request->getGet($key) ?? ''));

        $stats = "(SELECT customer_id, COUNT(*) AS visits, SUM(total) AS spent, MAX(sale_date) AS last_visit FROM sales "
            . "WHERE company_id = {$companyId} AND status = 'completed' AND is_training = 0 AND customer_id IS NOT NULL GROUP BY customer_id) st";

        // Completed refunds on those same sales, so "spent" is what the
        // customer actually kept paying for, not what rang up before returns.
        $refunds = "(SELECT sa.customer_id, SUM(r.total_refund) AS refunded FROM returns r JOIN sales sa ON sa.id = r.sale_id "
            . "WHERE sa.company_id = {$companyId} AND sa.is_training = 0 AND r.status = 'completed' AND sa.customer_id IS NOT NULL GROUP BY sa.customer_id) rf";

        $builder = $db->table('customers c')
            ->join($stats, 'st.customer_id = c.id', 'left', false)
            ->join($refunds, 'rf.customer_id = c.id', 'left', false)
            // One card per customer, so a second card can never list them twice.
            ->join('(SELECT customer_id, MAX(card_number) AS card_number FROM loyalty_cards GROUP BY customer_id) lc', 'lc.customer_id = c.id', 'left', false)
            ->where('c.company_id', $companyId);

        if ($showPoints) {
            $builder->join('(SELECT customer_id, SUM(points_delta) AS points FROM loyalty_point_transactions GROUP BY customer_id) pt', 'pt.customer_id = c.id', 'left', false);
        }

        if ($get('q') !== '') {
            $builder->groupStart()
                ->like('c.name', $get('q'))
                ->orLike('c.customer_code', $get('q'))
                ->orLike('c.email', $get('q'))
                ->orLike('c.mobile', $get('q'))
                ->orLike('lc.card_number', $get('q'))
                ->groupEnd();
        }

        if ($withSegment) {
            if ($get('is_active') === '1' || $get('is_active') === '0') {
                $builder->where('c.is_active', (int) $get('is_active'));
            }
            match ($get('segment')) {
                'new' => $builder->where('c.created_at >=', date('Y-m-01 00:00:00')),
                'with_points' => $showPoints ? $builder->where('pt.points >', 0) : $builder,
                'never_bought' => $builder->where('st.visits IS NULL', null, false),
                'lapsed' => $builder->where('st.last_visit <', date('Y-m-d H:i:s', strtotime('-' . self::LAPSED_DAYS . ' days'))),
                default => $builder,
            };
        }

        return $builder;
    }

    public function index()
    {
        $response = parent::index();
        $body = json_decode($response->getBody(), true);

        if (($body['success'] ?? false) && is_array($body['data'] ?? null)) {
            $body['data'] = $this->attachPoints($body['data']);
            return $this->response->setJSON($body);
        }

        return $response;
    }

    public function show($id = null)
    {
        $response = parent::show($id);
        $body = json_decode($response->getBody(), true);

        if (($body['success'] ?? false) && isset($body['data'])) {
            [$decorated] = $this->attachPoints([$body['data']]);
            $body['data'] = $decorated;
            return $this->response->setJSON($body);
        }

        return $response;
    }

    /**
     * POST /api/v1/customers/{id}/points  body: { points_delta, note? }
     * Adjusts the customer's loyalty points directly from the Customers
     * page, issuing them a loyalty card on the fly if they don't already
     * have one — see LoyaltyCardModel::firstOrCreateForCustomer(). The
     * adjustment is appended to loyalty_point_transactions rather than
     * mutating a stored counter, so it immediately becomes a row the
     * points-history endpoint below returns.
     */
    public function points($id = null)
    {
        $customer = $this->applyScope()->find($id);

        if (! $customer) {
            return $this->notFound();
        }

        $payload = $this->request->getJSON(true) ?? [];

        if (! $this->validateData($payload, [
            'points_delta' => ['label' => 'Points', 'rules' => 'required|integer'],
            'note' => ['label' => 'Note', 'rules' => 'permit_empty|max_length[255]'],
        ])) {
            return $this->validationFail($this->validator->getErrors());
        }

        $card = model(LoyaltyCardModel::class)->firstOrCreateForCustomer((int) $id);

        model(LoyaltyPointTransactionModel::class)->record(
            (int) $id,
            (int) $card->id,
            (int) $payload['points_delta'],
            $payload['note'] ?? null,
            Services::authContext()->userId
        );

        Services::auditLogger()->log('points-adjust', 'Customer', (int) $id, $customer->name, [
            'points_delta' => ['old' => null, 'new' => (int) $payload['points_delta']],
            'note' => ['old' => null, 'new' => $payload['note'] ?? null],
        ]);

        [$decorated] = $this->attachPoints([(array) $customer]);

        return $this->ok($decorated, 'Points updated');
    }

    /**
     * GET /api/v1/customers/{id}/points-history — every ledger entry for
     * this customer, newest first, with the adjusting admin's name
     * attached so the table doesn't need a second round trip.
     */
    public function pointsHistory($id = null)
    {
        if (! $this->applyScope()->find($id)) {
            return $this->notFound();
        }

        $entries = model(LoyaltyPointTransactionModel::class)->historyForCustomer((int) $id);

        $userIds = array_values(array_unique(array_filter(array_map(static fn ($e) => $e->created_by, $entries))));
        $namesById = $userIds === [] ? [] : model(UserModel::class)->whereIn('id', $userIds)->findAll();
        $namesById = array_column($namesById, 'name', 'id');

        $decorated = array_map(static function ($entry) use ($namesById) {
            $entry->created_by_name = $namesById[$entry->created_by] ?? null;

            return $entry;
        }, $entries);

        return $this->ok($decorated);
    }

    /**
     * Attaches `points`/`loyalty_card_id`/`card_number` to each customer
     * row — points is the computed sum of that customer's ledger entries,
     * never a stored counter — if the caller can see loyalty data at all
     * (a role with customers.view but not loyalty.view, none exist today,
     * but the check costs nothing) AND the company actually runs a loyalty
     * program (loyalty_enabled) — a company with it switched off never
     * gets points/card data back here, regardless of the caller's own
     * permissions.
     */
    private function attachPoints(array $customers): array
    {
        $auth = Services::authContext();
        if (! in_array('loyalty.view', $auth->permissions, true)) {
            return $customers;
        }

        $company = model(CompanyModel::class)->find($auth->companyId);
        if (! $company || (int) ($company->loyalty_enabled ?? 1) !== 1) {
            return $customers;
        }

        $ids = array_map(static fn ($c) => (int) $c['id'], $customers);
        $cards = model(LoyaltyCardModel::class)->forCustomerIds($ids);
        $balances = model(LoyaltyPointTransactionModel::class)->balancesForCustomerIds($ids);

        foreach ($customers as &$customer) {
            $customerId = (int) $customer['id'];
            $card = $cards[$customerId] ?? null;
            $customer['points'] = $card ? ($balances[$customerId] ?? 0) : null;
            $customer['loyalty_card_id'] = $card->id ?? null;
            $customer['card_number'] = $card->card_number ?? null;
        }

        return $customers;
    }
}
