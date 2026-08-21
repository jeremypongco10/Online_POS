<?php

namespace App\Libraries;

use Config\Auth as AuthConfig;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\SignatureInvalidException;
use stdClass;
use UnexpectedValueException;

/**
 * Encodes/decodes access and refresh JWTs for the API.
 */
class JwtService
{
    private AuthConfig $config;

    public function __construct()
    {
        $this->config = config(AuthConfig::class);
    }

    public function issueAccessToken(int $userId, int $companyId, ?int $roleId, array $permissions): string
    {
        $now = time();

        $payload = [
            'iat' => $now,
            'exp' => $now + $this->config->accessTokenTTL,
            'jti' => $this->newJti(),
            'sub' => $userId,
            'type' => 'access',
            'company_id' => $companyId,
            'role_id' => $roleId,
            'permissions' => $permissions,
        ];

        return JWT::encode($payload, $this->config->jwtSecret, $this->config->jwtAlgo);
    }

    public function issueRefreshToken(int $userId): string
    {
        $now = time();

        $payload = [
            'iat' => $now,
            'exp' => $now + $this->config->refreshTokenTTL,
            'jti' => $this->newJti(),
            'sub' => $userId,
            'type' => 'refresh',
        ];

        return JWT::encode($payload, $this->config->jwtSecret, $this->config->jwtAlgo);
    }

    private function newJti(): string
    {
        return bin2hex(random_bytes(16));
    }

    /**
     * @throws ExpiredException|SignatureInvalidException|UnexpectedValueException
     */
    public function decode(string $token): stdClass
    {
        return JWT::decode($token, new Key($this->config->jwtSecret, $this->config->jwtAlgo));
    }
}
