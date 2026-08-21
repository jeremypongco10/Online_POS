<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table = 'users';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    // Note: password_hash is intentionally excluded from mass-assignment.
    // It is only ever set internally by hashPassword() from the virtual
    // `password` field, so API callers can never write a raw hash directly.
    protected $allowedFields = [
        'company_id', 'role_id', 'name', 'email', 'username',
        'phone', 'is_active', 'last_login_at', 'password',
    ];

    protected $validationRules = [
        'id' => 'permit_empty|is_natural', // used only to resolve the {id} placeholder below
        'company_id' => 'required|is_natural_no_zero',
        'role_id' => 'permit_empty|is_natural_no_zero',
        'name' => 'required|min_length[2]|max_length[150]',
        'email' => 'required|valid_email|max_length[150]|is_unique[users.email,id,{id}]',
        'username' => 'required|alpha_numeric_punct|max_length[60]|is_unique[users.username,id,{id}]',
        'phone' => 'permit_empty|max_length[30]',
        'is_active' => 'permit_empty|in_list[0,1]',
    ];

    protected $beforeInsert = ['hashPassword'];
    protected $beforeUpdate = ['hashPassword'];

    /**
     * `password` is a virtual field: if present, it's hashed into
     * `password_hash` and never persisted or returned in plaintext.
     * Also stamps password_changed_at so JwtAuthFilter can invalidate
     * every token issued before this change (see its `iat` check).
     */
    protected function hashPassword(array $data): array
    {
        if (! empty($data['data']['password'])) {
            $data['data']['password_hash'] = password_hash($data['data']['password'], PASSWORD_BCRYPT);
            $data['data']['password_changed_at'] = date('Y-m-d H:i:s');
        }
        unset($data['data']['password']);

        return $data;
    }

    /** Looks a user up by whichever of email or username matches — login accepts either. */
    public function findByIdentifier(string $identifier): ?object
    {
        return $this->where('email', $identifier)->orWhere('username', $identifier)->first();
    }

    public function permissionSlugs(int $userId): array
    {
        $row = $this->find($userId);
        if (! $row || $row->role_id === null) {
            return [];
        }

        return model(RoleModel::class)->permissionSlugs($row->role_id);
    }

    /**
     * failed_login_attempts / locked_until are deliberately NOT in
     * $allowedFields — they must never be settable through the generic
     * mass-assignable update() path (e.g. PUT /users/{id}). These write
     * them directly via the query builder instead.
     */
    public function isLocked(object $user): bool
    {
        return $user->locked_until !== null && strtotime($user->locked_until) > time();
    }

    public function registerFailedLogin(int $userId, int $maxAttempts, int $lockoutMinutes): void
    {
        $user = $this->find($userId);
        $attempts = (int) $user->failed_login_attempts + 1;

        $update = ['failed_login_attempts' => $attempts];

        if ($attempts >= $maxAttempts) {
            $update['locked_until'] = date('Y-m-d H:i:s', time() + $lockoutMinutes * 60);
            $update['failed_login_attempts'] = 0;
        }

        $this->db->table($this->table)->where('id', $userId)->update($update);
    }

    public function clearLoginLock(int $userId): void
    {
        $this->db->table($this->table)->where('id', $userId)->update([
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ]);
    }
}
