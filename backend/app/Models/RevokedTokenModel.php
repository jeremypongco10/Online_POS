<?php

namespace App\Models;

use CodeIgniter\Model;

class RevokedTokenModel extends Model
{
    protected $table = 'revoked_tokens';
    protected $primaryKey = 'jti';
    protected $useAutoIncrement = false;
    protected $returnType = 'object';
    protected $useTimestamps = false;

    protected $allowedFields = ['jti', 'user_id', 'expires_at', 'revoked_at'];

    protected $validationRules = [
        'jti' => ['label' => 'Token ID', 'rules' => 'required|max_length[36]'],
        'user_id' => ['label' => 'User', 'rules' => 'required|is_natural_no_zero'],
        'expires_at' => ['label' => 'Expiry date', 'rules' => 'required'],
    ];

    public function isRevoked(string $jti): bool
    {
        return $this->find($jti) !== null;
    }

    public function revoke(string $jti, int $userId, int $expiresAtTimestamp): void
    {
        if ($this->isRevoked($jti)) {
            return;
        }

        $this->insert([
            'jti' => $jti,
            'user_id' => $userId,
            'expires_at' => date('Y-m-d H:i:s', $expiresAtTimestamp),
            'revoked_at' => date('Y-m-d H:i:s'),
        ]);
    }

    /** Housekeeping: drop rows whose token would have expired anyway. */
    public function pruneExpired(): int
    {
        return $this->where('expires_at <', date('Y-m-d H:i:s'))->delete() ? $this->db->affectedRows() : 0;
    }
}
