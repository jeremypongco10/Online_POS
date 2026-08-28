<?php

namespace App\Models;

use CodeIgniter\Model;

/**
 * Read-only from the API's perspective — rows are only ever written by
 * AuditLogger, never through the generic create/update/delete path (see
 * AuditLogsController, which exposes index/show only).
 */
class AuditLogModel extends Model
{
    protected $table = 'audit_logs';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = false;

    protected $allowedFields = [
        'company_id', 'user_id', 'user_name', 'action',
        'entity_type', 'entity_id', 'entity_label', 'changes',
        'ip_address', 'created_at',
    ];

    /** Distinct entity_type values this company actually has logs for — feeds the filter dropdown. */
    public function entityTypesForCompany(int $companyId): array
    {
        return $this->where('company_id', $companyId)
            ->distinct()
            ->orderBy('entity_type', 'ASC')
            ->findColumn('entity_type') ?: [];
    }
}
