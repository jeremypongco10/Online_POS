<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

class Auth extends BaseConfig
{
    public string $jwtSecret;
    public string $jwtAlgo = 'HS256';
    public int $accessTokenTTL = 3600;       // 1 hour
    public int $refreshTokenTTL = 1209600;   // 14 days

    public int $maxLoginAttempts = 5;
    public int $lockoutMinutes = 15;

    public function __construct()
    {
        parent::__construct();

        $this->jwtSecret = (string) (env('JWT_SECRET') ?? '');
    }
}
