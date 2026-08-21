<?php

namespace App\Models;

use CodeIgniter\Model;

class UserStoreModel extends Model
{
    protected $table = 'user_stores';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = false;

    protected $allowedFields = ['user_id', 'store_id', 'is_default', 'created_at'];

    protected $validationRules = [
        'user_id' => 'required|is_natural_no_zero',
        'store_id' => 'required|is_natural_no_zero',
        'is_default' => 'permit_empty|in_list[0,1]',
    ];

    protected $beforeInsert = ['setCreatedAt'];

    protected function setCreatedAt(array $data): array
    {
        $data['data']['created_at'] ??= date('Y-m-d H:i:s');

        return $data;
    }

    /** Stores a user has access to, with is_default flagged. */
    public function storesForUser(int $userId): array
    {
        return $this->db->table('user_stores us')
            ->select('s.*, us.is_default')
            ->join('stores s', 's.id = us.store_id')
            ->where('us.user_id', $userId)
            ->orderBy('us.is_default', 'DESC')
            ->orderBy('s.name', 'ASC')
            ->get()->getResult();
    }

    /** Users with access to a store. */
    public function usersForStore(int $storeId): array
    {
        return $this->db->table('user_stores us')
            ->select('u.id, u.name, u.email, u.username, u.is_active, us.is_default')
            ->join('users u', 'u.id = us.user_id')
            ->where('us.store_id', $storeId)
            ->orderBy('u.name', 'ASC')
            ->get()->getResult();
    }

    /**
     * Active users with the "Bagger" role who are assigned to this store —
     * what the POS shows when a cashier needs to pick a bagger for a sale.
     * Roles are company-scoped, so this matches by role name within the
     * store's own company rather than a global role_id.
     */
    public function activeBaggersForStore(int $storeId): array
    {
        return $this->baggerQuery()->where('us.store_id', $storeId)->orderBy('u.name', 'ASC')->get()->getResult();
    }

    /**
     * Same eligibility rule as activeBaggersForStore(), narrowed to one
     * user — what SalesController::create() validates a submitted
     * bagger_id against before it's ever stored on a sale.
     */
    public function isEligibleBagger(int $userId, int $storeId): bool
    {
        return $this->baggerQuery()->where('us.store_id', $storeId)->where('u.id', $userId)->countAllResults() > 0;
    }

    private function baggerQuery()
    {
        return $this->db->table('user_stores us')
            ->select('u.id, u.name, u.username')
            ->join('users u', 'u.id = us.user_id')
            ->join('roles r', 'r.id = u.role_id')
            ->join('stores s', 's.id = us.store_id')
            ->where('u.is_active', 1)
            ->where('r.name', 'Bagger')
            ->where('r.company_id = s.company_id', null, false);
    }

    /**
     * Every user with the given role name, in the same company as the
     * store, who is currently store-restricted (has at least one existing
     * user_stores row) gets that store added to their allowed list —
     * called after a new store is created so a restricted Super Admin
     * isn't accidentally locked out of a store that now exists.
     * Unrestricted users (zero rows = access to every store already) are
     * left alone: inserting a row for one of them would flip them from
     * unrestricted to restricted-to-just-this-store, the opposite of
     * what's intended.
     */
    public function grantToRestrictedUsersWithRole(int $storeId, int $companyId, string $roleName): void
    {
        $userIds = $this->db->table('users u')
            ->distinct()
            ->select('u.id')
            ->join('roles r', 'r.id = u.role_id')
            ->join('user_stores us', 'us.user_id = u.id')
            ->where('u.company_id', $companyId)
            ->where('r.name', $roleName)
            ->get()->getResult();

        foreach ($userIds as $row) {
            $this->insert(['user_id' => (int) $row->id, 'store_id' => $storeId]);
        }
    }

    /**
     * Of $companyUserIds, which ones a caller restricted to $storeIds is
     * allowed to see: anyone unrestricted (no user_stores rows at all, so
     * they already have access to every store) plus anyone who shares at
     * least one store with the caller. Powers Users Maintenance so a
     * store-restricted admin sees their own team — plus whoever oversees
     * them — instead of the whole company roster.
     */
    public function idsVisibleTo(array $companyUserIds, array $storeIds): array
    {
        if ($companyUserIds === []) {
            return [];
        }

        $rows = $this->whereIn('user_id', $companyUserIds)->findAll();

        $restrictedIds = [];
        $sharingIds = [];
        foreach ($rows as $row) {
            $restrictedIds[(int) $row->user_id] = true;
            if (in_array((int) $row->store_id, $storeIds, true)) {
                $sharingIds[(int) $row->user_id] = true;
            }
        }

        $unrestrictedIds = array_diff($companyUserIds, array_keys($restrictedIds));

        return array_values(array_unique(array_merge($unrestrictedIds, array_keys($sharingIds))));
    }

    /**
     * Replaces a user's store access with exactly the given store IDs.
     * $defaultStoreId, if given, must be one of $storeIds.
     */
    public function syncForUser(int $userId, array $storeIds, ?int $defaultStoreId = null): void
    {
        $this->where('user_id', $userId)->delete();

        foreach ($storeIds as $storeId) {
            $this->insert([
                'user_id' => $userId,
                'store_id' => $storeId,
                'is_default' => $defaultStoreId !== null && $defaultStoreId === $storeId ? 1 : 0,
            ]);
        }
    }
}
