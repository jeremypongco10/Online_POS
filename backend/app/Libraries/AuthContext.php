<?php

namespace App\Libraries;

/**
 * Holds the authenticated user's identity and permissions for the
 * lifetime of the current request. Populated by JwtAuthFilter,
 * read by PermissionFilter and controllers.
 */
class AuthContext
{
    public bool $authenticated = false;
    public ?int $userId = null;
    public ?int $companyId = null;
    public ?int $roleId = null;
    public ?string $jti = null;
    public ?int $tokenExpiresAt = null;
    /** @var string[] */
    public array $permissions = [];

    /**
     * Store IDs this user is explicitly restricted to (from user_stores),
     * or null if they hold no store assignments and are therefore
     * unrestricted within their own company. Populated by JwtAuthFilter.
     */
    public ?array $allowedStoreIds = null;

    public function setUser(int $userId, int $companyId, ?int $roleId, array $permissions): void
    {
        $this->authenticated = true;
        $this->userId = $userId;
        $this->companyId = $companyId;
        $this->roleId = $roleId;
        $this->permissions = $permissions;
    }

    public function setAllowedStores(?array $storeIds): void
    {
        $this->allowedStoreIds = $storeIds;
    }

    public function canAccessStore(int $storeId): bool
    {
        return $this->allowedStoreIds === null || in_array($storeId, $this->allowedStoreIds, true);
    }

    public function setToken(string $jti, int $expiresAt): void
    {
        $this->jti = $jti;
        $this->tokenExpiresAt = $expiresAt;
    }

    public function hasPermission(string $slug): bool
    {
        return in_array($slug, $this->permissions, true);
    }
}
