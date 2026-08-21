<?php

namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Model;
use CodeIgniter\RESTful\ResourceController;

/**
 * Common ground for every API controller: a single JSON response
 * envelope, and a reusable pagination / filtering / sorting / search
 * helper so every list endpoint behaves the same way.
 *
 * Response envelope:
 * {
 *   "success": bool,
 *   "message": string,
 *   "data": mixed,
 *   "errors": object|null,
 *   "meta": object|null   // pagination info on list endpoints
 * }
 */
abstract class BaseApiController extends ResourceController
{
    protected $format = 'json';

    protected function ok($data = null, string $message = '', ?array $meta = null): ResponseInterface
    {
        return $this->respond($this->envelope(true, $message, $data, null, $meta), 200);
    }

    protected function created($data = null, string $message = 'Created'): ResponseInterface
    {
        return $this->respond($this->envelope(true, $message, $data), 201);
    }

    protected function noContentOk(string $message = 'Deleted'): ResponseInterface
    {
        return $this->respond($this->envelope(true, $message, null), 200);
    }

    protected function apiFail(string $message, int $status = 400, $errors = null): ResponseInterface
    {
        return $this->respond($this->envelope(false, $message, null, $errors), $status);
    }

    protected function validationFail($errors): ResponseInterface
    {
        return $this->apiFail('The given data was invalid.', 422, $errors);
    }

    protected function notFound(string $message = 'Resource not found'): ResponseInterface
    {
        return $this->apiFail($message, 404);
    }

    protected function forbidden(string $message = 'You do not have permission to perform this action'): ResponseInterface
    {
        return $this->apiFail($message, 403);
    }

    protected function unauthorized(string $message = 'Authentication required'): ResponseInterface
    {
        return $this->apiFail($message, 401);
    }

    private function envelope(bool $success, string $message, $data = null, $errors = null, ?array $meta = null): array
    {
        return [
            'success' => $success,
            'message' => $message,
            'data' => $data,
            'errors' => $errors,
            'meta' => $meta,
        ];
    }

    /**
     * Applies filter / search / sort / pagination query params to a model
     * and returns ['data' => [...], 'meta' => [...]].
     *
     * Supported query params:
     *   page       (default 1)
     *   per_page   (default 15, max 100)
     *   sort       column name; prefix with "-" for descending
     *   q          free-text search across $searchableFields
     *   any column listed in $allowedFilters=value for an exact match
     *
     * @param string[] $allowedFilters   columns that may be filtered on exactly
     * @param string[] $allowedSorts     columns that may be sorted on
     * @param string[] $searchableFields columns included in the "q" LIKE search
     */
    protected function listResource(
        Model $model,
        array $allowedFilters = [],
        array $allowedSorts = [],
        array $searchableFields = [],
        string $defaultSort = 'id'
    ): array {
        $request = $this->request;
        $builder = $model->builder();

        foreach ($allowedFilters as $field) {
            $value = $request->getGet($field);
            if ($value !== null && $value !== '') {
                $builder->where($field, $value);
            }
        }

        $search = trim((string) $request->getGet('q'));
        if ($search !== '' && $searchableFields !== []) {
            $builder->groupStart();
            foreach ($searchableFields as $i => $field) {
                $method = $i === 0 ? 'like' : 'orLike';
                $builder->{$method}($field, $search);
            }
            $builder->groupEnd();
        }

        // $defaultSort may itself carry a "-" prefix (e.g. '-created_at'),
        // same convention as the ?sort= query param — parse both the same way.
        $sortColumn = ltrim($defaultSort, '-');
        $sortDirection = str_starts_with($defaultSort, '-') ? 'DESC' : 'ASC';

        $sortParam = (string) $request->getGet('sort');
        if ($sortParam !== '') {
            $direction = str_starts_with($sortParam, '-') ? 'DESC' : 'ASC';
            $column = ltrim($sortParam, '-');
            if (in_array($column, $allowedSorts, true)) {
                $sortColumn = $column;
                $sortDirection = $direction;
            }
        }
        $builder->orderBy($sortColumn, $sortDirection);

        $perPage = (int) ($request->getGet('per_page') ?? 15);
        $perPage = max(1, min($perPage, 100));
        $page = max(1, (int) ($request->getGet('page') ?? 1));

        $total = $builder->countAllResults(false);
        $rows = $builder->get($perPage, ($page - 1) * $perPage)->getResult();

        return [
            'data' => $rows,
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => (int) ceil($total / $perPage) ?: 1,
            ],
        ];
    }
}
