<?php

namespace App\Libraries;

use App\Models\AuditLogModel;
use App\Models\UserModel;
use Config\Services;

/**
 * The single write path for the audit trail (see AuditLogsController for
 * the read side). Every controller that mutates data calls log() after
 * the mutation succeeds — never before, so a failed write is never
 * recorded as having happened.
 */
class AuditLogger
{
    private ?int $cachedUserId = null;
    private ?string $cachedUserName = null;

    /**
     * Field names that must never reach the log, regardless of which
     * table they come from — the generic BaseCrudController hook logs
     * a full `(array) $row` snapshot on create/delete (and diffs it on
     * update), which for `users` would otherwise include password_hash
     * verbatim. Every log() call is filtered through this, not just the
     * generic hook, since a custom controller could just as easily pass
     * a raw row through.
     */
    private const REDACTED_FIELDS = ['password', 'password_hash'];

    /**
     * @param string $action     'create' | 'update' | 'delete', or a more
     *                           specific verb for a custom endpoint (e.g.
     *                           'void', 'approve', 'adjust') — the entity
     *                           types below all read as past-tense-ish
     *                           regardless, so any short present-tense verb
     *                           works.
     * @param string $entityType Human-readable entity name, e.g. 'Product', 'Sale'.
     * @param array  $changes    For create: the new row. For update: a
     *                           field => ['old' => ..., 'new' => ...] diff
     *                           (see diff()). For delete: the row that was
     *                           removed. Empty when there's nothing
     *                           meaningful to snapshot.
     */
    public function log(string $action, string $entityType, ?int $entityId, ?string $entityLabel, array $changes = []): void
    {
        $auth = Services::authContext();

        if (! $auth->authenticated || $auth->companyId === null) {
            return;
        }

        $this->write($auth->companyId, $auth->userId, $this->userName($auth->userId), $action, $entityType, $entityId, $entityLabel, $changes);
    }

    /**
     * Same as log(), but for the one class of event that happens outside
     * an authenticated request: login (success or failure) and logout.
     * AuthController::login()/refresh() run before JwtAuthFilter ever
     * populates AuthContext — Services::authContext()->authenticated is
     * always false there — so this takes the company/user identity
     * explicitly instead of reading it off the (not-yet-set) context.
     * $userId is null for a login attempt against an identifier that
     * matched no account at all — there's no tenant to attribute that to,
     * so the caller should skip logging that case entirely rather than
     * calling this with a null $companyId.
     */
    public function logAuthEvent(int $companyId, int $userId, string $userName, string $action, ?string $reason = null): void
    {
        $this->write($companyId, $userId, $userName, $action, 'User', $userId, $userName, $reason !== null ? ['reason' => $reason] : []);
    }

    private function write(
        int $companyId,
        ?int $userId,
        ?string $userName,
        string $action,
        string $entityType,
        ?int $entityId,
        ?string $entityLabel,
        array $changes
    ): void {
        foreach (self::REDACTED_FIELDS as $field) {
            unset($changes[$field]);
        }

        model(AuditLogModel::class)->insert([
            'company_id' => $companyId,
            'user_id' => $userId,
            'user_name' => $userName,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'entity_label' => $entityLabel !== null ? mb_substr($entityLabel, 0, 150) : null,
            'changes' => $changes === [] ? null : json_encode($changes),
            'ip_address' => Services::request()->getIPAddress(),
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Field-level diff between a row's state before and after an update.
     * Only fields present in both and actually changed are included —
     * an update that touches every column but changes nothing produces
     * an empty diff (the caller should skip logging in that case).
     */
    public function diff(array $old, array $new, array $ignore = ['updated_at', 'created_at']): array
    {
        $changes = [];

        foreach ($new as $key => $value) {
            if (in_array($key, $ignore, true) || ! array_key_exists($key, $old)) {
                continue;
            }
            if ((string) ($old[$key] ?? '') !== (string) ($value ?? '')) {
                $changes[$key] = ['old' => $old[$key], 'new' => $value];
            }
        }

        return $changes;
    }

    private function userName(?int $userId): ?string
    {
        if ($userId === null) {
            return null;
        }
        if ($this->cachedUserId === $userId) {
            return $this->cachedUserName;
        }

        $user = model(UserModel::class)->find($userId);
        $this->cachedUserId = $userId;
        $this->cachedUserName = $user->name ?? null;

        return $this->cachedUserName;
    }
}
