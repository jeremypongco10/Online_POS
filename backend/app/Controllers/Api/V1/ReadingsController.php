<?php

namespace App\Controllers\Api\V1;

use App\Controllers\BaseApiController;
use App\Models\RegisterModel;
use App\Models\StoreModel;
use App\Models\ZReadingModel;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Database;
use Config\Services;

/**
 * /api/v1/readings — the X-reading and Z-reading a BIR-accredited
 * terminal has to be able to produce.
 *
 * An X-reading is a look at the terminal's figures so far without
 * closing anything: take as many as you like, nothing is written, no
 * counter moves. A Z-reading closes the period, is written to
 * z_readings permanently, and advances that terminal's Z counter —
 * which is why it is a POST and the X is a GET.
 *
 * Both are computed by one service (BirReadingService) so they can never
 * disagree. The period a Z covers starts where the previous Z for that
 * terminal ended, so the readings tile the terminal's whole life with no
 * gap and no overlap — a sale can be on exactly one Z, and every sale is
 * on one.
 */
class ReadingsController extends BaseApiController
{
    /**
     * A register the caller is actually allowed to read, or null.
     * Store-restricted users can only read terminals in their own
     * stores, the same rule every other store-scoped endpoint applies.
     */
    private function accessibleRegister(int $registerId): ?object
    {
        $auth = Services::authContext();
        $register = model(RegisterModel::class)->find($registerId);

        if (! $register) {
            return null;
        }

        $store = model(StoreModel::class)->find((int) $register->store_id);
        if (! $store || (int) $store->company_id !== $auth->companyId) {
            return null;
        }

        return $auth->canAccessStore((int) $register->store_id) ? $register : null;
    }

    /** Where this terminal's next reading starts: the moment the last Z stopped. */
    private function periodStart(int $registerId): string
    {
        $last = model(ZReadingModel::class)
            ->where('register_id', $registerId)
            ->orderBy('z_counter', 'DESC')
            ->first();

        // No Z yet: cover everything the terminal has ever rung up, so the
        // first Z can't silently omit sales taken before readings existed.
        return $last->covers_to ?? '1970-01-01 00:00:00';
    }

    /**
     * GET /api/v1/readings/x?register_id=
     *
     * Everything since the last Z, read without closing it.
     */
    public function x(): ResponseInterface
    {
        $registerId = (int) ($this->request->getGet('register_id') ?? 0);
        $register = $this->accessibleRegister($registerId);

        if (! $register) {
            return $this->notFound('Register not found');
        }

        $from = $this->periodStart($registerId);
        $to = date('Y-m-d H:i:s');
        $service = Services::birReadingService();
        $store = model(StoreModel::class)->find((int) $register->store_id);

        return $this->ok([
            'type' => 'X',
            ...$this->identity($register, $store),
            'covers_from' => $from,
            'covers_to' => $to,
            'beginning_grand_total' => round($service->grandTotal($registerId) - $this->periodNet($registerId, $from, $to), 2),
            'ending_grand_total' => round($service->grandTotal($registerId), 2),
            ...$service->compute($registerId, $from, $to),
        ]);
    }

    /**
     * The net sales inside this period, used only to derive what the
     * grand total read at the start of it. The accumulated total itself
     * is never rewound — this is arithmetic for display, so an X shows
     * the same "from / to" bracket a Z will.
     */
    private function periodNet(int $registerId, string $from, string $to): float
    {
        return (float) (Database::connect()->table('sales')
            ->selectSum('total')
            ->where('register_id', $registerId)
            ->where('is_training', 0)
            ->where('status', 'completed')
            ->where('sale_date >', $from)
            ->where('sale_date <=', $to)
            ->get()
            ->getRow()->total ?? 0);
    }

    /** The machine identifiers every reading is printed under. */
    private function identity(object $register, ?object $store): array
    {
        return [
            'register_id' => (int) $register->id,
            'register_name' => $register->name,
            'store_id' => (int) $register->store_id,
            'store_name' => $store->name ?? null,
            'min_no' => $store->min_no ?? null,
            'pos_serial_no' => $store->pos_serial_no ?? null,
            'ptu_number' => $store->ptu_number ?? null,
            'z_counter' => (int) $register->z_counter,
            'reset_counter' => (int) $register->reset_counter,
        ];
    }

    /**
     * POST /api/v1/readings/z  body: { register_id }
     *
     * Closes the period and writes the Z. The counter bump and the insert
     * share one transaction with a locked register row, so two cashiers
     * closing the same terminal at once can't both take Z number 12.
     */
    public function z(): ResponseInterface
    {
        $payload = $this->request->getJSON(true) ?? [];
        $registerId = (int) ($payload['register_id'] ?? 0);
        $register = $this->accessibleRegister($registerId);

        if (! $register) {
            return $this->notFound('Register not found');
        }

        $db = Database::connect();
        $db->transStart();

        $forUpdate = $db->DBDriver === 'MySQLi' ? ' FOR UPDATE' : '';
        $locked = $db->query('SELECT * FROM registers WHERE id = ?' . $forUpdate, [$registerId])->getFirstRow();

        $from = $this->periodStart($registerId);
        $to = date('Y-m-d H:i:s');
        $service = Services::birReadingService();
        $figures = $service->compute($registerId, $from, $to);

        $endingGrandTotal = (float) $locked->grand_total;
        $beginningGrandTotal = round($endingGrandTotal - $this->periodNet($registerId, $from, $to), 2);
        $zCounter = (int) $locked->z_counter + 1;
        $store = model(StoreModel::class)->find((int) $register->store_id);

        $id = model(ZReadingModel::class)->insert([
            'company_id' => Services::authContext()->companyId,
            'store_id' => (int) $register->store_id,
            'register_id' => $registerId,
            'z_counter' => $zCounter,
            'reset_counter' => (int) $locked->reset_counter,
            'business_date' => date('Y-m-d'),
            'covers_from' => $from,
            'covers_to' => $to,
            'min_no' => $store->min_no ?? null,
            'pos_serial_no' => $store->pos_serial_no ?? null,
            'ptu_number' => $store->ptu_number ?? null,
            'beginning_grand_total' => $beginningGrandTotal,
            'ending_grand_total' => $endingGrandTotal,
            'generated_by' => Services::authContext()->userId,
            ...$figures,
        ], true);

        if ($id === false) {
            $db->transRollback();

            return $this->apiFail('Failed to record the Z-reading', 500);
        }

        $db->query('UPDATE registers SET z_counter = ? WHERE id = ?', [$zCounter, $registerId]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->apiFail('Failed to record the Z-reading', 500);
        }

        $reading = model(ZReadingModel::class)->find($id);
        Services::auditLogger()->log('create', 'Z-Reading', (int) $id, "Z #{$zCounter} — {$register->name}", (array) $reading);

        return $this->created(['type' => 'Z', ...(array) $reading]);
    }

    /**
     * GET /api/v1/readings/z — issued Z-readings, newest first.
     * Optional ?register_id= / ?from= / ?to= (business_date).
     */
    public function index(): ResponseInterface
    {
        $auth = Services::authContext();
        $model = model(ZReadingModel::class)->where('company_id', $auth->companyId);

        if ($auth->allowedStoreIds !== null) {
            $model = $model->whereIn('store_id', $auth->allowedStoreIds ?: [0]);
        }
        if ($registerId = $this->request->getGet('register_id')) {
            $model = $model->where('register_id', (int) $registerId);
        }
        if ($from = $this->request->getGet('from')) {
            $model = $model->where('business_date >=', $from);
        }
        if ($to = $this->request->getGet('to')) {
            $model = $model->where('business_date <=', $to);
        }

        $perPage = min(100, max(1, (int) ($this->request->getGet('per_page') ?? 20)));
        $page = max(1, (int) ($this->request->getGet('page') ?? 1));
        $rows = $model->orderBy('business_date', 'DESC')->orderBy('z_counter', 'DESC')->paginate($perPage, 'default', $page);

        return $this->ok($rows, '', [
            'page' => $page,
            'per_page' => $perPage,
            'total' => model(ZReadingModel::class)->pager->getTotal() ?? count($rows),
        ]);
    }

    /** GET /api/v1/readings/z/{id} */
    public function show($id = null): ResponseInterface
    {
        $auth = Services::authContext();
        $reading = model(ZReadingModel::class)->where('company_id', $auth->companyId)->find((int) $id);

        if (! $reading || ! $auth->canAccessStore((int) $reading->store_id)) {
            return $this->notFound('Z-reading not found');
        }

        return $this->ok($reading);
    }
}
