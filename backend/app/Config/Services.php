<?php

namespace Config;

use CodeIgniter\Config\BaseService;

/**
 * Services Configuration file.
 *
 * Services are simply other classes/libraries that the system uses
 * to do its job. This is used by CodeIgniter to allow the core of the
 * framework to be swapped out easily without affecting the usage within
 * the rest of your application.
 *
 * This file holds any application-specific services, or service overrides
 * that you might need. An example has been included with the general
 * method format you should use for your service methods. For more examples,
 * see the core Services file at system/Config/Services.php.
 */
class Services extends BaseService
{
    public static function authContext(bool $getShared = true): \App\Libraries\AuthContext
    {
        if ($getShared) {
            return static::getSharedInstance('authContext');
        }

        return new \App\Libraries\AuthContext();
    }

    public static function jwtService(bool $getShared = true): \App\Libraries\JwtService
    {
        if ($getShared) {
            return static::getSharedInstance('jwtService');
        }

        return new \App\Libraries\JwtService();
    }

    public static function taxService(bool $getShared = true): \App\Libraries\TaxService
    {
        if ($getShared) {
            return static::getSharedInstance('taxService');
        }

        return new \App\Libraries\TaxService();
    }

    public static function paymentService(bool $getShared = true): \App\Libraries\PaymentService
    {
        if ($getShared) {
            return static::getSharedInstance('paymentService');
        }

        return new \App\Libraries\PaymentService();
    }

    public static function inventoryCalculator(bool $getShared = true): \App\Libraries\InventoryCalculator
    {
        if ($getShared) {
            return static::getSharedInstance('inventoryCalculator');
        }

        return new \App\Libraries\InventoryCalculator();
    }

    public static function auditLogger(bool $getShared = true): \App\Libraries\AuditLogger
    {
        if ($getShared) {
            return static::getSharedInstance('auditLogger');
        }

        return new \App\Libraries\AuditLogger();
    }
}
