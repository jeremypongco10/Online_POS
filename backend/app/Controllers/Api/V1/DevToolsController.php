<?php

namespace App\Controllers\Api\V1;

use App\Controllers\BaseApiController;
use App\Libraries\TransactionResetService;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;
use RuntimeException;

/**
 * POST /api/v1/dev/reset-transactions — the HTTP twin of
 * `php spark dev:reset-transactions`, for whoever would rather click a
 * button in Settings > Security than open a terminal. Same work, same
 * TransactionResetService, same refusal once ENVIRONMENT is production —
 * this controller only adds the things an HTTP-reachable destructive
 * endpoint needs that a local CLI command doesn't: the companies.manage
 * permission gate (Routes.php) and a typed confirmation checked
 * server-side, exactly the pattern SystemResetController::reset() already
 * uses for the same reason (a destructive endpoint should not be one
 * stray POST away from firing for anything holding the token).
 *
 * The frontend button itself only renders in a dev build (see
 * ResetTransactionsCard in SettingsScreen.tsx) — this route staying live
 * in a production API is what the ENVIRONMENT check below is actually for.
 */
class DevToolsController extends BaseApiController
{
    public function resetTransactions(): ResponseInterface
    {
        $payload = $this->request->getJSON(true) ?? [];

        if (($payload['confirm'] ?? null) !== 'RESET') {
            return $this->apiFail('Send confirm: "RESET" to run this.', 422);
        }

        try {
            $tables = (new TransactionResetService())->reset();
        } catch (RuntimeException $e) {
            return $this->apiFail($e->getMessage(), 403);
        }

        Services::auditLogger()->log('dev-reset', 'System', null, 'Transaction data reset', ['tables' => $tables]);

        return $this->ok(['tables' => $tables], 'Transaction data cleared and counters rewound.');
    }
}
