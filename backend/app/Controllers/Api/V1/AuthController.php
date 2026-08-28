<?php

namespace App\Controllers\Api\V1;

use App\Controllers\BaseApiController;
use App\Models\RevokedTokenModel;
use App\Models\RoleModel;
use App\Models\UserModel;
use Config\Auth as AuthConfig;
use Config\Services;
use Firebase\JWT\ExpiredException;
use Throwable;

class AuthController extends BaseApiController
{
    public function login()
    {
        $rules = [
            'identifier' => ['label' => 'Email or username', 'rules' => 'required'],
            'password' => ['label' => 'Password', 'rules' => 'required'],
        ];

        if (! $this->validateData($this->request->getJSON(true) ?? [], $rules)) {
            return $this->validationFail($this->validator->getErrors());
        }

        $payload = $this->request->getJSON(true);
        $userModel = model(UserModel::class);
        $user = $userModel->findByIdentifier($payload['identifier']);
        $authConfig = config(AuthConfig::class);

        // Both checked before verifying the password — neither depends on
        // what was submitted, so checking them first means a locked or
        // deactivated account never leaks whether the password itself was
        // correct (an attacker can't distinguish "right password, locked
        // account" from "wrong password, locked account").
        if ($user && $userModel->isLocked($user)) {
            $minutesLeft = (int) ceil((strtotime($user->locked_until) - time()) / 60);
            Services::auditLogger()->logAuthEvent((int) $user->company_id, (int) $user->id, $user->name, 'login-failed', 'Account locked');

            return $this->apiFail("Account is locked due to too many failed login attempts. Try again in {$minutesLeft} minute(s).", 423);
        }

        if ($user && ! (bool) $user->is_active) {
            Services::auditLogger()->logAuthEvent((int) $user->company_id, (int) $user->id, $user->name, 'login-failed', 'Account inactive');

            return $this->unauthorized('Account is no longer active');
        }

        if (! $user || ! password_verify($payload['password'], $user->password_hash)) {
            // A $user with no match at all has no company to attribute the
            // attempt to — nothing meaningful to log there. A found user
            // with the wrong password does, and is worth recording: a
            // string of these against one account is exactly what an
            // admin reviewing the trail would want to see.
            if ($user) {
                $userModel->registerFailedLogin($user->id, $authConfig->maxLoginAttempts, $authConfig->lockoutMinutes);
                Services::auditLogger()->logAuthEvent((int) $user->company_id, (int) $user->id, $user->name, 'login-failed', 'Incorrect password');
            }

            return $this->apiFail('Invalid credentials', 401);
        }

        $userModel->clearLoginLock($user->id);
        $userModel->update($user->id, ['last_login_at' => date('Y-m-d H:i:s')]);
        Services::auditLogger()->logAuthEvent((int) $user->company_id, (int) $user->id, $user->name, 'login');

        return $this->tokenResponse($user);
    }

    /** POST /api/v1/auth/logout — revokes the current access token, and the refresh token if supplied. */
    public function logout()
    {
        $auth = Services::authContext();
        $revokedModel = model(RevokedTokenModel::class);

        // logout() runs behind the jwtAuth filter (unlike login()), so
        // AuthContext is already populated here — the plain log() path
        // applies, same as any other authenticated action.
        Services::auditLogger()->log('logout', 'User', $auth->userId, null);

        if ($auth->jti !== null && $auth->tokenExpiresAt !== null) {
            $revokedModel->revoke($auth->jti, $auth->userId, $auth->tokenExpiresAt);
        }

        $payload = $this->request->getJSON(true) ?? [];
        $refreshToken = $payload['refresh_token'] ?? null;

        if ($refreshToken !== null) {
            try {
                $claims = Services::jwtService()->decode($refreshToken);
                if (($claims->type ?? null) === 'refresh') {
                    $revokedModel->revoke($claims->jti, (int) $claims->sub, (int) $claims->exp);
                }
            } catch (Throwable $e) {
                // Already invalid/expired — nothing to revoke.
            }
        }

        return $this->ok(null, 'Logged out');
    }

    public function refresh()
    {
        $payload = $this->request->getJSON(true) ?? [];
        $refreshToken = $payload['refresh_token'] ?? '';

        if ($refreshToken === '') {
            return $this->apiFail('refresh_token is required', 422);
        }

        try {
            $claims = Services::jwtService()->decode($refreshToken);
        } catch (ExpiredException $e) {
            return $this->unauthorized('Refresh token has expired');
        } catch (Throwable $e) {
            return $this->unauthorized('Invalid refresh token');
        }

        if (($claims->type ?? null) !== 'refresh') {
            return $this->unauthorized('Invalid token type');
        }

        $revokedModel = model(RevokedTokenModel::class);
        if ($revokedModel->isRevoked($claims->jti ?? '')) {
            return $this->unauthorized('Refresh token has been revoked');
        }

        $user = model(UserModel::class)->find((int) $claims->sub);

        if (! $user || ! (bool) $user->is_active) {
            return $this->unauthorized('Account is no longer active');
        }

        // Rotate: the old refresh token is single-use.
        $revokedModel->revoke($claims->jti, (int) $claims->sub, (int) $claims->exp);

        return $this->tokenResponse($user);
    }

    /**
     * POST /api/v1/auth/change-password  body: { current_password, new_password }
     * Self-service — any logged-in user changes their own password. Unlike
     * UsersController::resetPassword() (an admin acting on someone else),
     * this requires proving the current password rather than an
     * administrative permission.
     *
     * UserModel::hashPassword() stamps password_changed_at on write, which
     * JwtAuthFilter checks against every token's `iat` — so this one write
     * also invalidates every token issued before it, on every device. We
     * issue a fresh pair in the same response (iat = now, after the stamp)
     * so the caller isn't logged out by their own change.
     */
    public function changePassword()
    {
        $rules = [
            'current_password' => ['label' => 'Current password', 'rules' => 'required'],
            'new_password' => ['label' => 'New password', 'rules' => 'required|min_length[8]'],
        ];

        if (! $this->validateData($this->request->getJSON(true) ?? [], $rules)) {
            return $this->validationFail($this->validator->getErrors());
        }

        $payload = $this->request->getJSON(true);
        $auth = Services::authContext();
        $userModel = model(UserModel::class);
        $user = $userModel->find($auth->userId);

        if (! $user || ! password_verify($payload['current_password'], $user->password_hash)) {
            return $this->validationFail(['current_password' => 'Current password is incorrect.']);
        }

        if ($payload['new_password'] === $payload['current_password']) {
            return $this->validationFail(['new_password' => 'New password must be different from your current password.']);
        }

        $userModel->update($user->id, ['password' => $payload['new_password']]);

        return $this->tokenResponse($userModel->find($user->id));
    }

    public function me()
    {
        $auth = Services::authContext();
        $user = model(UserModel::class)->find($auth->userId);

        if (! $user) {
            return $this->notFound('User not found');
        }

        unset($user->password_hash);
        $user->permissions = $auth->permissions;
        $this->attachRoleName($user);

        return $this->ok($user);
    }

    /**
     * The frontend needs the role's name (not just its id) to decide
     * whether a freshly-logged-in user should land on the POS screen by
     * default — permissions alone don't distinguish Cashier/Cashier
     * Supervisor from Bagger, which has an equally narrow set.
     */
    private function attachRoleName(object $user): void
    {
        $role = $user->role_id !== null ? model(RoleModel::class)->find((int) $user->role_id) : null;
        $user->role_name = $role !== null ? $role->name : null;
    }

    private function tokenResponse(object $user)
    {
        $permissions = model(UserModel::class)->permissionSlugs($user->id);

        $jwt = Services::jwtService();
        $accessToken = $jwt->issueAccessToken($user->id, (int) $user->company_id, $user->role_id !== null ? (int) $user->role_id : null, $permissions);
        $refreshToken = $jwt->issueRefreshToken($user->id);

        unset($user->password_hash);
        $this->attachRoleName($user);

        return $this->ok([
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'token_type' => 'Bearer',
            'user' => $user,
        ], 'Authenticated');
    }
}
