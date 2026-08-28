<?php

namespace App\Controllers\Api\V1;

use App\Controllers\BaseApiController;
use App\Models\AuditLogModel;
use Config\Services;

/**
 * Read-only view of the audit trail written by AuditLogger — there is
 * deliberately no create/update/delete here (see AuditLogModel's class
 * doc): the log itself must stay tamper-proof from the API's side.
 */
class AuditLogsController extends BaseApiController
{
    public function index()
    {
        $model = model(AuditLogModel::class)->where('company_id', Services::authContext()->companyId);

        // Plain YYYY-MM-DD from a date input — widened to the full day so
        // "to" includes every entry made ON that date, not just ones at
        // exactly midnight.
        if ($from = $this->request->getGet('from')) {
            $model->where('created_at >=', "{$from} 00:00:00");
        }
        if ($to = $this->request->getGet('to')) {
            $model->where('created_at <=', "{$to} 23:59:59");
        }

        $result = $this->listResource(
            $model,
            ['entity_type', 'entity_id', 'user_id', 'action'],
            ['id', 'created_at'],
            ['entity_label', 'user_name'],
            '-created_at'
        );

        return $this->ok(array_map([$this, 'decodeChanges'], $result['data']), '', $result['meta']);
    }

    public function show($id = null)
    {
        $row = model(AuditLogModel::class)->where('company_id', Services::authContext()->companyId)->find($id);

        if ($row === null) {
            return $this->notFound();
        }

        return $this->ok($this->decodeChanges($row));
    }

    /** `changes` is stored as a JSON string (see AuditLogger::log) — decode it so the API always hands back a real object, not a string the client would have to parse itself. */
    private function decodeChanges(object $row): object
    {
        $row->changes = $row->changes !== null ? json_decode($row->changes, true) : null;

        return $row;
    }

    /** GET /api/v1/audit-logs/entity-types — feeds the entity filter dropdown with only the types this company actually has logs for. */
    public function entityTypes()
    {
        return $this->ok(model(AuditLogModel::class)->entityTypesForCompany(Services::authContext()->companyId));
    }
}
