<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

/**
 * Per-IP request throttling (token bucket via CodeIgniter's built-in
 * Throttler, backed by the configured cache handler — file cache by
 * default, so this works with no extra infrastructure; point Cache at
 * Redis/Memcached in production if running multiple app servers behind
 * a load balancer, since file cache is per-instance).
 *
 * Route filter argument is "capacity,seconds,scope", e.g.
 * 'rateLimit:300,60,api' = 300 requests per 60 seconds per IP. `scope`
 * (default 'default') namespaces the token bucket so two differently
 * configured rate limits on the same request — the global API-wide
 * limit and auth/login's much stricter one — don't share a bucket and
 * corrupt each other's counts.
 *
 * This is a defense-in-depth layer, not a substitute for the app-level
 * account lockout already in UserModel::registerFailedLogin() — that
 * one is per-account; this one is per-IP and catches distributed or
 * cross-account abuse (credential stuffing, scraping) that lockout
 * alone wouldn't slow down.
 */
class RateLimitFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        [$capacity, $seconds, $scope] = $this->parseArguments($arguments);

        $throttler = Services::throttler();
        // Cache keys can't contain {}()/\@: — notably ':', which both an
        // IPv6 address and a naive "scope:ip" join would introduce.
        $key = $scope . '_' . str_replace(':', '-', $request->getIPAddress());

        if (! $throttler->check($key, $capacity, $seconds)) {
            return Services::response()
                ->setStatusCode(429)
                ->setHeader('Retry-After', (string) $throttler->getTokenTime())
                ->setJSON([
                    'success' => false,
                    'message' => 'Too many requests. Please try again later.',
                    'data' => null,
                    'errors' => null,
                    'meta' => null,
                ]);
        }

        return $request;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // no-op
    }

    /** @return array{0: int, 1: int, 2: string} */
    private function parseArguments($arguments): array
    {
        $capacity = (int) ($arguments[0] ?? 120);
        $seconds = (int) ($arguments[1] ?? 60);
        $scope = (string) ($arguments[2] ?? 'default');

        return [max(1, $capacity), max(1, $seconds), $scope];
    }
}
