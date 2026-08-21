<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

/**
 * Route filter argument is the required permission slug, e.g.
 * 'permission:products.create'. Must run after JwtAuthFilter.
 */
class PermissionFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $required = $arguments[0] ?? null;

        if ($required === null) {
            return $request;
        }

        $auth = Services::authContext();

        if (! $auth->authenticated) {
            return $this->deny('Authentication required', 401);
        }

        if (! $auth->hasPermission($required)) {
            return $this->deny('You do not have permission to perform this action', 403);
        }

        return $request;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // no-op
    }

    private function deny(string $message, int $status)
    {
        return Services::response()->setStatusCode($status)->setJSON([
            'success' => false,
            'message' => $message,
            'data' => null,
            'errors' => null,
            'meta' => null,
        ]);
    }
}
