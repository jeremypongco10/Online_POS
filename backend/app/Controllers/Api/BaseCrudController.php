<?php

namespace App\Controllers\Api;

use App\Controllers\BaseApiController;
use App\Models\StoreModel;
use CodeIgniter\Database\Exceptions\DatabaseException;
use CodeIgniter\Model;
use Config\Services;

/**
 * Generic CRUD for a single model. A resource controller extends this,
 * sets $modelClass plus the filter/sort/search allow-lists, and gets
 * index/show/create/update/delete for free with consistent responses,
 * pagination, filtering, sorting, search, and model-level validation.
 *
 * $model itself (untyped) and its wiring from $modelName are inherited
 * from CodeIgniter\RESTful\BaseResource; $modelClass here just feeds
 * $modelName so that base machinery instantiates the right model.
 */
abstract class BaseCrudController extends BaseApiController
{
    protected string $modelClass;

    /** @var string[] columns that may be filtered on with ?field=value */
    protected array $allowedFilters = [];

    /** @var string[] columns that may be sorted on with ?sort=field or ?sort=-field */
    protected array $allowedSorts = ['id'];

    /** @var string[] columns included in the ?q= free-text search */
    protected array $searchableFields = [];

    protected string $defaultSort = 'id';

    /**
     * Column on this table holding the owning company's id. Every
     * index/show/update/delete is forced to match the caller's own
     * company_id through this column, regardless of any client-
     * supplied filter — a client can never read or write another
     * tenant's row by guessing/incrementing an id. Set to null only
     * for genuinely global, non-tenant tables (e.g. units). A table
     * with no company_id column of its own must override applyScope()
     * to scope indirectly (see RegistersController, CashSessionsController,
     * LoyaltyController, PaymentsController, ReturnsController).
     */
    protected ?string $companyColumn = 'company_id';

    /**
     * Column on this table holding the owning store's id. When the
     * caller holds explicit rows in user_stores (AuthContext::$allowedStoreIds
     * is non-null), every index/show/update/delete is additionally
     * narrowed to their assigned stores. Left null for tables with no
     * direct store column — see applyScope() override note above.
     */
    protected ?string $storeColumn = null;

    public function initController(
        \CodeIgniter\HTTP\RequestInterface $request,
        \CodeIgniter\HTTP\ResponseInterface $response,
        \Psr\Log\LoggerInterface $logger
    ) {
        $this->modelName = $this->modelClass;
        parent::initController($request, $response, $logger);
    }

    /**
     * Applies the tenant/store scope to $this->model's pending query and
     * returns it so callers can chain find()/findAll() as usual. Override
     * in a controller whose table has no company_id column of its own.
     */
    protected function applyScope(): Model
    {
        $auth = Services::authContext();
        $query = $this->model;

        if ($this->companyColumn !== null) {
            $query = $query->where($this->companyColumn, $auth->companyId);
        }

        if ($this->storeColumn !== null && $auth->allowedStoreIds !== null) {
            $query = $query->whereIn($this->storeColumn, $auth->allowedStoreIds ?: [0]);
        }

        return $query;
    }

    /**
     * Store IDs belonging to the caller's own company, narrowed further
     * to their assigned stores if they're store-restricted. Used by
     * controllers whose table scopes indirectly through store_id rather
     * than carrying a company_id column of its own.
     */
    protected function scopeByStoreIds(string $column): Model
    {
        $auth = Services::authContext();
        $storeIds = model(StoreModel::class)->where('company_id', $auth->companyId)->findColumn('id') ?: [];

        if ($auth->allowedStoreIds !== null) {
            $storeIds = array_values(array_intersect($storeIds, $auth->allowedStoreIds));
        }

        return $this->model->whereIn($column, $storeIds ?: [0]);
    }

    public function index()
    {
        $result = $this->listResource(
            $this->applyScope(),
            $this->allowedFilters,
            $this->allowedSorts,
            $this->searchableFields,
            $this->defaultSort
        );

        return $this->ok($result['data'], '', $result['meta']);
    }

    public function show($id = null)
    {
        $row = $this->applyScope()->find($id);

        if ($row === null) {
            return $this->notFound();
        }

        return $this->ok($row);
    }

    public function create()
    {
        $payload = $this->payload();

        // The owning tenant is always the caller's own company — never
        // trusted from the request body, so a client can't write a row
        // into another company by supplying a different company_id.
        if ($this->companyColumn !== null) {
            $payload[$this->companyColumn] = Services::authContext()->companyId;
        }

        try {
            $id = $this->model->insert($payload, true);
        } catch (DatabaseException $e) {
            return $this->duplicateKeyFail($e);
        }

        if ($id === false) {
            return $this->validationFail($this->model->errors());
        }

        $row = $this->model->find($id);
        Services::auditLogger()->log('create', $this->auditEntityType(), $id, $this->auditLabel($row), (array) $row);

        return $this->created($row);
    }

    public function update($id = null)
    {
        $before = $this->applyScope()->find($id);
        if ($before === null) {
            return $this->notFound();
        }

        $payload = $this->payload();

        // CI4's `is_unique[table.field,id,{id}]` convention only fills the
        // {id} placeholder from a key literally named "id" in the row being
        // validated — it is not injected automatically from the update()
        // $id argument. Without this, updates that keep an existing unique
        // value (e.g. saving a record without changing its SKU/email/slug)
        // would incorrectly fail validation against themselves. `id` is not
        // in any model's $allowedFields, so it's stripped before the write.
        $payload['id'] = $id;

        // Same reasoning as create(): a client could otherwise move this
        // row to a different tenant by including company_id in the body.
        if ($this->companyColumn !== null) {
            $payload[$this->companyColumn] = Services::authContext()->companyId;
        }

        try {
            $ok = $this->model->update($id, $payload);
        } catch (DatabaseException $e) {
            return $this->duplicateKeyFail($e);
        }

        if (! $ok) {
            return $this->validationFail($this->model->errors());
        }

        $after = $this->model->find($id);
        $changes = Services::auditLogger()->diff((array) $before, (array) $after);
        if ($changes !== []) {
            Services::auditLogger()->log('update', $this->auditEntityType(), (int) $id, $this->auditLabel($after), $changes);
        }

        return $this->ok($after, 'Updated');
    }

    /**
     * Friendly entity name for the audit trail, derived from the model
     * class — "App\Models\TaxRateModel" -> "Tax Rate". Override in a
     * controller whose model name wouldn't read naturally this way.
     */
    protected function auditEntityType(): string
    {
        $short = strrchr($this->modelClass, '\\');
        $short = $short !== false ? substr($short, 1) : $this->modelClass;
        $short = preg_replace('/Model$/', '', $short);

        return trim((string) preg_replace('/(?<!^)(?=[A-Z])/', ' ', $short));
    }

    /**
     * A human-readable label for a row in the audit trail — tries the
     * common "this is what identifies a row" fields in order. Override
     * when a table's meaningful identifier isn't one of these (e.g. a
     * pivot table, or something identified by a foreign key instead).
     */
    protected function auditLabel(?object $row): ?string
    {
        if ($row === null) {
            return null;
        }

        foreach (['name', 'sku', 'invoice_number', 'po_number', 'return_number', 'card_number', 'code', 'email', 'title'] as $field) {
            if (! empty($row->{$field})) {
                return (string) $row->{$field};
            }
        }

        return null;
    }

    /**
     * MariaDB/MySQL's duplicate-entry message names the violated key but,
     * on this server (MariaDB), not the table — e.g. "Duplicate entry
     * 'X' for key 'company_id_name'" with no table qualifier. Composite
     * unique keys here are always auto-named by concatenating their
     * columns in definition order (see the addUniqueKey() calls in
     * app/Database/Migrations/), so this maps each such key name to the
     * one column in it that's actually meaningful to the person who
     * typed the value — the rest of the key is just the tenant/parent
     * scope (company_id, store_id, product_id, ...). A key name that
     * collides across tables (e.g. categories/roles/tax_rates all share
     * company_id_name) still maps correctly here because the answer is
     * the same regardless of which table triggered it — the field really
     * is called "name" in all three.
     */
    private const DUPLICATE_KEY_FIELDS = [
        'name' => 'name',                                    // companies
        'company_id_code' => 'code',                          // stores
        'company_id_name' => 'name',                          // roles, categories, tax_rates
        'slug' => 'slug',                                     // permissions
        'email' => 'email',                                   // users
        'username' => 'username',                             // users
        'role_id_permission_id' => 'permission',              // role_permissions
        'user_id_store_id' => 'store',                        // user_stores
        'store_id_code' => 'code',                            // registers
        'abbreviation' => 'abbreviation',                     // units
        'company_id_sku' => 'SKU',                            // products
        'company_id_barcode' => 'barcode',                    // products
        'product_id_store_id' => 'store',                     // inventory, store_product_prices
        'card_number' => 'card number',                       // loyalty_cards
        'company_id_po_number' => 'PO number',                // purchase_orders
        'company_id_invoice_number' => 'invoice number',      // sales
        'return_number' => 'return number',                   // returns
        'company_id_store_id_type' => 'type',                 // invoice_sequences
    ];

    /**
     * A unique-constraint violation the model's own $validationRules
     * didn't catch (e.g. a composite unique key like (company_id, code)
     * that a single-column `is_unique` rule can't express) would
     * otherwise surface as a raw 500 with a DB-engine error message —
     * genuinely unexpected DatabaseExceptions are re-thrown as-is so
     * they aren't mistaken for validation failures.
     */
    protected function duplicateKeyFail(DatabaseException $e)
    {
        if (! str_contains($e->getMessage(), 'Duplicate entry')) {
            throw $e;
        }

        if (preg_match("/for key '(?:[\\w-]+\\.)?([\\w-]+)'/", $e->getMessage(), $matches) && isset(self::DUPLICATE_KEY_FIELDS[$matches[1]])) {
            return $this->apiFail('That ' . self::DUPLICATE_KEY_FIELDS[$matches[1]] . ' is already in use.', 422);
        }

        return $this->apiFail('That value is already in use.', 422);
    }

    public function delete($id = null)
    {
        $row = $this->applyScope()->find($id);
        if ($row === null) {
            return $this->notFound();
        }

        $this->model->delete($id);
        Services::auditLogger()->log('delete', $this->auditEntityType(), (int) $id, $this->auditLabel($row), (array) $row);

        return $this->noContentOk();
    }

    protected function payload(): array
    {
        $json = $this->request->getJSON(true);

        return is_array($json) ? $json : $this->request->getPost();
    }
}
