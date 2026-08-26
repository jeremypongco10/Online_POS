<?php

namespace App\Models;

use CodeIgniter\Model;

class CashMovementModel extends Model
{
    public const TYPE_CASH_IN = 'cash_in';
    public const TYPE_CASH_OUT = 'cash_out';

    protected $table = 'cash_movements';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = false;

    protected $allowedFields = ['cash_session_id', 'type', 'amount', 'reason', 'user_id', 'created_at'];

    protected $validationRules = [
        'cash_session_id' => ['label' => 'Cash session', 'rules' => 'required|is_natural_no_zero'],
        'type' => ['label' => 'Type', 'rules' => 'required|in_list[cash_in,cash_out]'],
        'amount' => ['label' => 'Amount', 'rules' => 'required|decimal|greater_than[0]'],
        'reason' => ['label' => 'Reason', 'rules' => 'permit_empty|max_length[255]'],
    ];

    protected $beforeInsert = ['setCreatedAt'];

    protected function setCreatedAt(array $data): array
    {
        $data['data']['created_at'] ??= date('Y-m-d H:i:s');

        return $data;
    }

    public function netTotal(int $cashSessionId): float
    {
        $rows = $this->select('type, COALESCE(SUM(amount), 0) AS total')
            ->where('cash_session_id', $cashSessionId)
            ->groupBy('type')
            ->findAll();

        $in = 0.0;
        $out = 0.0;
        foreach ($rows as $row) {
            if ($row->type === self::TYPE_CASH_IN) {
                $in = (float) $row->total;
            } else {
                $out = (float) $row->total;
            }
        }

        return $in - $out;
    }
}
