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

        return $this->created($this->model->find($id));
    }

    public function update($id = null)
    {
        if ($this->applyScope()->find($id) === null) {
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

        return $this->ok($this->model->find($id), 'Updated');
    }

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

        return $this->apiFail('That value is already in use.', 422);
    }

    public function delete($id = null)
    {
        if ($this->applyScope()->find($id) === null) {
            return $this->notFound();
        }

        $this->model->delete($id);

        return $this->noContentOk();
    }

    protected function payload(): array
    {
        $json = $this->request->getJSON(true);

        return is_array($json) ? $json : $this->request->getPost();
    }
}
