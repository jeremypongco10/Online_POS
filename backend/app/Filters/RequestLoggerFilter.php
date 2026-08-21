<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

/**
 * Logs every API request: method, path, status code, duration, and the
 * authenticated user (if any). Runs as a global "after" filter so it
 * sees the final response status regardless of which controller/filter
 * produced it.
 */
class RequestLoggerFilter implements FilterInterface
{
    private float $startedAt;

    public function before(RequestInterface $request, $arguments = null)
    {
        $this->startedAt = microtime(true);

        return $request;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        $durationMs = round((microtime(true) - $this->startedAt) * 1000, 2);
        $userId = Services::authContext()->userId ?? 'guest';

        log_message(
            'info',
            '[API] {method} {path} -> {status} ({duration}ms) user={user}',
            [
                'method' => $request->getMethod(),
                'path' => $request->getPath(),
                'status' => $response->getStatusCode(),
                'duration' => $durationMs,
                'user' => $userId,
            ]
        );
    }
}
