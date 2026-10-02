<?php

namespace App\Controllers\Api;

use App\Models\UserModel;
use App\Models\UserStoreModel;
use Config\Auth as AuthConfig;
use Config\Services;

/**
 * Supervisor sign-off at the register: someone else walks over and types
 * their own credentials to approve what the signed-in cashier cannot do
 * alone (a void, a manual discount, a return). Shared so every approval
 * path gets the same lockout, audit and store checks.
 */
trait ResolvesSupervisorApprover
{
    /**
     * Shared credential/authority check behind authorizeItemVoid(),
     * authorizeCartVoid(), and authorizeItemDiscount() — verifying a
     * supervisor is real, active, unlocked, holds $requiredPermission,
     * and (if the caller is store-restricted) assigned to
     * $payload['store_id'], logging every denial along the way under the
     * caller-supplied $deniedAction/$entityType/$label.
     *
     * $requiredPermission varies by caller (sales.void for the two void
     * endpoints, sales.discount for the discount endpoint) — approving a
     * void and approving a discount are kept as distinct authorities in
     * this app, the same way returns.create and returns.approve are
     * deliberately separate, so one supervisor role can be given one
     * without the other.
     *
     * Returns the approver row on success, or a ResponseInterface to
     * return immediately on failure — callers check with `instanceof
     * ResponseInterface`, not is_object(): the approver row is also a
     * plain object (UserModel's returnType), so is_object() alone can
     * never tell the two apart. (Found live while testing Manual
     * Discount's wrong-password path — the same bug was already latent
     * in authorizeItemVoid/authorizeCartVoid, just never exercised.)
     * The account-safety handling here deliberately mirrors
     * AuthController::login(): this accepts a password, so it is a
     * credential endpoint and gets the same lockout, inactive-account,
     * and failed-attempt handling. Skipping any of it would make this a
     * softer side door for guessing a supervisor's password than the
     * login form itself.
     */
    protected function resolveSupervisorApprover(array $payload, string $requiredPermission, string $deniedAction, string $entityType, string $label)
    {
        $auth = Services::authContext();
        $userModel = model(UserModel::class);
        $approver = $userModel->findByIdentifier($payload['identifier']);
        $authConfig = config(AuthConfig::class);

        // Cross-tenant approval must be impossible, so an approver from
        // another company is treated exactly like a nonexistent one —
        // same message, same 401 — rather than a distinct error that
        // would confirm the account exists somewhere.
        if ($approver && (int) $approver->company_id !== (int) $auth->companyId) {
            $approver = null;
        }

        if ($approver && $userModel->isLocked($approver)) {
            $minutesLeft = (int) ceil((strtotime($approver->locked_until) - time()) / 60);
            Services::auditLogger()->log($deniedAction, $entityType, null, $label, [
                'reason' => 'Approver account locked',
                'identifier' => $payload['identifier'],
            ]);

            return $this->apiFail("That account is locked due to too many failed attempts. Try again in {$minutesLeft} minute(s).", 423);
        }

        if ($approver && ! (bool) $approver->is_active) {
            $approver = null;
        }

        if (! $approver || ! password_verify($payload['password'], $approver->password_hash)) {
            if ($approver) {
                $userModel->registerFailedLogin($approver->id, $authConfig->maxLoginAttempts, $authConfig->lockoutMinutes);
            }

            // Logged even on failure: repeated failed void approvals on
            // one terminal is exactly the pattern a manager reviewing the
            // trail would want surfaced.
            Services::auditLogger()->log($deniedAction, $entityType, null, $label, [
                'reason' => 'Invalid supervisor credentials',
                'identifier' => $payload['identifier'],
            ]);

            return $this->apiFail('Invalid supervisor credentials', 401);
        }

        $userModel->rehashPasswordIfNeeded((int) $approver->id, $payload['password'], $approver->password_hash);

        if (! in_array($requiredPermission, $userModel->permissionSlugs((int) $approver->id), true)) {
            Services::auditLogger()->log($deniedAction, $entityType, null, $label, [
                'reason' => "Approver lacks {$requiredPermission}",
                'approved_by' => $approver->name,
            ]);

            return $this->forbidden('That user is not authorized to approve this');
        }

        // A store-restricted approver (Cashier Supervisor and Store Admin
        // are pinned to exactly one store — see UsersController::
        // SINGLE_STORE_ROLES) can only sign off at their own store. Zero
        // rows means unrestricted, which is access to every store, so
        // that case passes through untouched.
        $storeId = isset($payload['store_id']) ? (int) $payload['store_id'] : null;
        if ($storeId !== null) {
            $approverStores = array_map(
                static fn ($s) => (int) $s->id,
                model(UserStoreModel::class)->storesForUser((int) $approver->id)
            );

            if ($approverStores !== [] && ! in_array($storeId, $approverStores, true)) {
                return $this->forbidden('That supervisor is not assigned to this store');
            }
        }

        $userModel->clearLoginLock((int) $approver->id);

        return $approver;
    }
}
