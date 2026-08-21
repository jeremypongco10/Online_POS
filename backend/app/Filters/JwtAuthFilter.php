<?php

namespace App\Filters;

use App\Models\RevokedTokenModel;
use App\Models\UserModel;
use App\Models\UserStoreModel;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;
use Firebase\JWT\ExpiredException;
use Throwable;

class JwtAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $header = $request->getHeaderLine('Authorization');

        if ($header === '' || ! str_starts_with($header, 'Bearer ')) {
            return $this->unauthorized('Missing bearer token');
        }

        $token = substr($header, 7);

        try {
            $claims = Services::jwtService()->decode($token);
        } catch (ExpiredException $e) {
            return $this->unauthorized('Token has expired');
        } catch (Throwable $e) {
            return $this->unauthorized('Invalid token');
        }

        if (($claims->type ?? null) !== 'access') {
            return $this->unauthorized('Invalid token type');
        }

        if (model(RevokedTokenModel::class)->isRevoked($claims->jti ?? '')) {
            return $this->unauthorized('Token has been revoked');
        }

        // Deactivated/deleted accounts lose access immediately, even with
        // an otherwise still-valid, unexpired access token.
        $user = model(UserModel::class)->find((int) $claims->sub);
        if (! $user || ! (bool) $user->is_active) {
            return $this->unauthorized('Account is no longer active');
        }

        // A password reset invalidates every token issued before it,
        // without needing to enumerate/revoke each one individually.
        if ($user->password_changed_at !== null && (int) $claims->iat < strtotime($user->password_changed_at)) {
            return $this->unauthorized('Session invalidated by a password change. Please log in again.');
        }

        Services::authContext()->setUser(
            (int) $claims->sub,
            (int) $claims->company_id,
            $claims->role_id !== null ? (int) $claims->role_id : null,
            (array) $claims->permissions
        );
        Services::authContext()->setToken((string) $claims->jti, (int) $claims->exp);

        // Users with explicit store assignments are locked to those
        // stores for every store-scoped resource (sales, inventory,
        // registers, cash sessions, returns, purchase orders); users
        // with no assignments at all are unrestricted within their
        // own company — see AuthContext::canAccessStore().
        $storeIds = array_map(
            static fn ($store) => (int) $store->id,
            model(UserStoreModel::class)->storesForUser((int) $claims->sub)
        );
        Services::authContext()->setAllowedStores($storeIds === [] ? null : $storeIds);

        return $request;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // no-op
    }

    private function unauthorized(string $message)
    {
        $response = Services::response();

        return $response->setStatusCode(401)->setJSON([
            'success' => false,
            'message' => $message,
            'data' => null,
            'errors' => null,
            'meta' => null,
        ]);
    }
}
