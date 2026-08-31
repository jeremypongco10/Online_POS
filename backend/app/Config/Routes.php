<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */
$routes->get('/', 'Home::index');

// CORS preflight: browsers send OPTIONS before any cross-origin POST/PUT/
// DELETE, but no route below registers OPTIONS explicitly, so without this
// catch-all every preflight 404s before the 'cors' global filter ever runs.
$routes->options('(:any)', static function () {
    return service('response')->setStatusCode(204);
});

$routes->group('api/v1', ['namespace' => 'App\Controllers\Api\V1'], static function (RouteCollection $routes) {

    // --- Auth: login/refresh are public, everything else needs a token ---
    $routes->group('auth', static function (RouteCollection $routes) {
        // Stricter than the global API rate limit (see Filters::$globals)
        // — credential guessing is the highest-value target on this API,
        // and per-account lockout (UserModel::registerFailedLogin) alone
        // doesn't stop a distributed/low-and-slow attempt across accounts.
        $routes->post('login', 'AuthController::login', ['filter' => 'rateLimit:10,300,auth']);
        $routes->post('refresh', 'AuthController::refresh', ['filter' => 'rateLimit:20,300,auth']);
        $routes->get('me', 'AuthController::me', ['filter' => 'jwtAuth']);
        $routes->post('logout', 'AuthController::logout', ['filter' => 'jwtAuth']);
        $routes->post('change-password', 'AuthController::changePassword', ['filter' => 'jwtAuth']);
    });

    // --- Everything below requires a valid access token ---
    $routes->group('', ['filter' => 'jwtAuth'], static function (RouteCollection $routes) {

        $routes->group('companies', static function (RouteCollection $routes) {
            $routes->get('', 'CompaniesController::index', ['filter' => 'permission:companies.view']);
            $routes->get('(:num)', 'CompaniesController::show/$1', ['filter' => 'permission:companies.view']);
            $routes->post('', 'CompaniesController::create', ['filter' => 'permission:companies.manage']);
            $routes->put('(:num)', 'CompaniesController::update/$1', ['filter' => 'permission:companies.manage']);
            $routes->delete('(:num)', 'CompaniesController::delete/$1', ['filter' => 'permission:companies.manage']);
        });

        $routes->group('stores', static function (RouteCollection $routes) {
            $routes->get('', 'StoresController::index', ['filter' => 'permission:stores.view']);
            $routes->get('(:num)', 'StoresController::show/$1', ['filter' => 'permission:stores.view']);
            $routes->get('(:num)/users', 'StoresController::users/$1', ['filter' => 'permission:stores.view']);
            // Gated on sales.create (not stores.view) since this is what a
            // cashier's POS screen calls to populate a bagger picker.
            $routes->get('(:num)/baggers', 'StoresController::baggers/$1', ['filter' => 'permission:sales.create']);
            $routes->post('', 'StoresController::create', ['filter' => 'permission:stores.manage']);
            $routes->put('(:num)', 'StoresController::update/$1', ['filter' => 'permission:stores.manage']);
            $routes->delete('(:num)', 'StoresController::delete/$1', ['filter' => 'permission:stores.manage']);
        });

        $routes->group('users', static function (RouteCollection $routes) {
            $routes->get('', 'UsersController::index', ['filter' => 'permission:users.view']);
            $routes->get('stores/assignable', 'UsersController::assignableStores', ['filter' => 'permission:users.update']);
            $routes->get('(:num)', 'UsersController::show/$1', ['filter' => 'permission:users.view']);
            $routes->get('(:num)/stores', 'UsersController::stores/$1', ['filter' => 'permission:users.view']);
            $routes->put('(:num)/stores', 'UsersController::syncStores/$1', ['filter' => 'permission:users.update']);
            $routes->put('(:num)/role', 'UsersController::assignRole/$1', ['filter' => 'permission:users.update']);
            $routes->post('(:num)/reset-password', 'UsersController::resetPassword/$1', ['filter' => 'permission:users.update']);
            $routes->post('', 'UsersController::create', ['filter' => 'permission:users.create']);
            $routes->put('(:num)', 'UsersController::update/$1', ['filter' => 'permission:users.update']);
            $routes->post('(:num)/activate', 'UsersController::activate/$1', ['filter' => 'permission:users.update']);
            $routes->post('(:num)/deactivate', 'UsersController::deactivate/$1', ['filter' => 'permission:users.update']);
            $routes->delete('(:num)', 'UsersController::delete/$1', ['filter' => 'permission:users.update']);
        });

        $routes->group('roles', static function (RouteCollection $routes) {
            $routes->get('', 'RolesController::index', ['filter' => 'permission:roles.view']);
            $routes->get('(:num)', 'RolesController::show/$1', ['filter' => 'permission:roles.view']);
            $routes->get('(:num)/permissions', 'RolesController::permissions/$1', ['filter' => 'permission:roles.view']);
            $routes->put('(:num)/permissions', 'RolesController::syncPermissions/$1', ['filter' => 'permission:roles.manage']);
            $routes->post('', 'RolesController::create', ['filter' => 'permission:roles.manage']);
            $routes->put('(:num)', 'RolesController::update/$1', ['filter' => 'permission:roles.manage']);
            $routes->delete('(:num)', 'RolesController::delete/$1', ['filter' => 'permission:roles.manage']);
        });

        $routes->group('permissions', static function (RouteCollection $routes) {
            $routes->get('', 'PermissionsController::index', ['filter' => 'permission:roles.view']);
            $routes->get('(:num)', 'PermissionsController::show/$1', ['filter' => 'permission:roles.view']);
        });

        $routes->group('products', static function (RouteCollection $routes) {
            $routes->get('', 'ProductsController::index', ['filter' => 'permission:products.view']);
            $routes->post('bulk', 'ProductsController::bulkCreate', ['filter' => 'permission:products.create']);
            $routes->put('prices/bulk', 'ProductsController::bulkUpdatePrices', ['filter' => 'permission:products.update']);
            $routes->get('(:num)', 'ProductsController::show/$1', ['filter' => 'permission:products.view']);
            $routes->post('', 'ProductsController::create', ['filter' => 'permission:products.create']);
            $routes->put('(:num)', 'ProductsController::update/$1', ['filter' => 'permission:products.update']);
            $routes->delete('(:num)', 'ProductsController::delete/$1', ['filter' => 'permission:products.delete']);
            $routes->get('(:num)/prices', 'ProductsController::prices/$1', ['filter' => 'permission:products.view']);
            $routes->put('(:num)/prices', 'ProductsController::updatePrices/$1', ['filter' => 'permission:products.update']);
            $routes->post('(:num)/image', 'ProductsController::uploadImage/$1', ['filter' => 'permission:products.update']);
            $routes->delete('(:num)/image', 'ProductsController::deleteImage/$1', ['filter' => 'permission:products.update']);
        });

        $routes->group('categories', static function (RouteCollection $routes) {
            $routes->get('', 'CategoriesController::index', ['filter' => 'permission:categories.view']);
            $routes->get('tree', 'CategoriesController::tree', ['filter' => 'permission:categories.view']);
            $routes->get('(:num)', 'CategoriesController::show/$1', ['filter' => 'permission:categories.view']);
            $routes->post('', 'CategoriesController::create', ['filter' => 'permission:categories.manage']);
            $routes->put('(:num)', 'CategoriesController::update/$1', ['filter' => 'permission:categories.manage']);
            $routes->delete('(:num)', 'CategoriesController::delete/$1', ['filter' => 'permission:categories.manage']);
        });

        $routes->group('units', static function (RouteCollection $routes) {
            $routes->get('', 'UnitsController::index', ['filter' => 'permission:units.view']);
            $routes->get('(:num)', 'UnitsController::show/$1', ['filter' => 'permission:units.view']);
            $routes->post('', 'UnitsController::create', ['filter' => 'permission:units.manage']);
            $routes->put('(:num)', 'UnitsController::update/$1', ['filter' => 'permission:units.manage']);
            $routes->delete('(:num)', 'UnitsController::delete/$1', ['filter' => 'permission:units.manage']);
        });

        $routes->group('taxes', static function (RouteCollection $routes) {
            $routes->get('', 'TaxesController::index', ['filter' => 'permission:taxes.view']);
            $routes->get('(:num)', 'TaxesController::show/$1', ['filter' => 'permission:taxes.view']);
            $routes->post('', 'TaxesController::create', ['filter' => 'permission:taxes.manage']);
            $routes->put('(:num)', 'TaxesController::update/$1', ['filter' => 'permission:taxes.manage']);
            $routes->delete('(:num)', 'TaxesController::delete/$1', ['filter' => 'permission:taxes.manage']);
        });

        $routes->group('inventory', static function (RouteCollection $routes) {
            $routes->get('', 'InventoryController::index', ['filter' => 'permission:inventory.view']);
            $routes->get('movements', 'InventoryController::movements', ['filter' => 'permission:inventory.view']);
            $routes->get('by-product/(:num)', 'InventoryController::byProduct/$1', ['filter' => 'permission:inventory.view']);
            $routes->get('(:num)', 'InventoryController::show/$1', ['filter' => 'permission:inventory.view']);
            $routes->post('adjust', 'InventoryController::adjust', ['filter' => 'permission:inventory.adjust']);
            $routes->post('transfer', 'InventoryController::transfer', ['filter' => 'permission:inventory.transfer']);
        });

        $routes->group('customers', static function (RouteCollection $routes) {
            $routes->get('', 'CustomersController::index', ['filter' => 'permission:customers.view']);
            $routes->get('(:num)', 'CustomersController::show/$1', ['filter' => 'permission:customers.view']);
            $routes->post('', 'CustomersController::create', ['filter' => 'permission:customers.create']);
            $routes->put('(:num)', 'CustomersController::update/$1', ['filter' => 'permission:customers.update']);
            $routes->post('(:num)/points', 'CustomersController::points/$1', ['filter' => 'permission:loyalty.manage']);
            $routes->get('(:num)/points-history', 'CustomersController::pointsHistory/$1', ['filter' => 'permission:loyalty.view']);
            $routes->delete('(:num)', 'CustomersController::delete/$1', ['filter' => 'permission:customers.update']);
        });

        $routes->group('loyalty', static function (RouteCollection $routes) {
            $routes->get('', 'LoyaltyController::index', ['filter' => 'permission:loyalty.view']);
            // Gated on sales.create (not loyalty.view) — this is the POS
            // register scanning a card mid-checkout, same reasoning as
            // the store baggers endpoint.
            $routes->get('scan', 'LoyaltyController::scan', ['filter' => 'permission:sales.create']);
            $routes->get('(:num)', 'LoyaltyController::show/$1', ['filter' => 'permission:loyalty.view']);
            $routes->post('', 'LoyaltyController::create', ['filter' => 'permission:loyalty.manage']);
            $routes->put('(:num)', 'LoyaltyController::update/$1', ['filter' => 'permission:loyalty.manage']);
            $routes->post('(:num)/activate', 'LoyaltyController::activate/$1', ['filter' => 'permission:loyalty.manage']);
            $routes->post('(:num)/deactivate', 'LoyaltyController::deactivate/$1', ['filter' => 'permission:loyalty.manage']);
            $routes->post('(:num)/block', 'LoyaltyController::block/$1', ['filter' => 'permission:loyalty.manage']);
            $routes->post('(:num)/report-lost', 'LoyaltyController::reportLost/$1', ['filter' => 'permission:loyalty.manage']);
            $routes->post('(:num)/adjust', 'LoyaltyController::adjust/$1', ['filter' => 'permission:loyalty.manage']);
            $routes->delete('(:num)', 'LoyaltyController::delete/$1', ['filter' => 'permission:loyalty.manage']);
        });

        $routes->group('suppliers', static function (RouteCollection $routes) {
            $routes->get('', 'SuppliersController::index', ['filter' => 'permission:suppliers.view']);
            $routes->get('(:num)', 'SuppliersController::show/$1', ['filter' => 'permission:suppliers.view']);
            $routes->post('', 'SuppliersController::create', ['filter' => 'permission:suppliers.manage']);
            $routes->put('(:num)', 'SuppliersController::update/$1', ['filter' => 'permission:suppliers.manage']);
            $routes->delete('(:num)', 'SuppliersController::delete/$1', ['filter' => 'permission:suppliers.manage']);
        });

        $routes->group('purchases', static function (RouteCollection $routes) {
            $routes->get('', 'PurchasesController::index', ['filter' => 'permission:purchases.view']);
            $routes->get('(:num)', 'PurchasesController::show/$1', ['filter' => 'permission:purchases.view']);
            $routes->get('(:num)/items', 'PurchasesController::items/$1', ['filter' => 'permission:purchases.view']);
            $routes->post('', 'PurchasesController::create', ['filter' => 'permission:purchases.create']);
            $routes->put('(:num)', 'PurchasesController::update/$1', ['filter' => 'permission:purchases.manage']);
            $routes->post('(:num)/approve', 'PurchasesController::approve/$1', ['filter' => 'permission:purchases.manage']);
            $routes->post('(:num)/receive', 'PurchasesController::receive/$1', ['filter' => 'permission:purchases.manage']);
            $routes->post('(:num)/cancel', 'PurchasesController::cancel/$1', ['filter' => 'permission:purchases.manage']);
            $routes->delete('(:num)', 'PurchasesController::delete/$1', ['filter' => 'permission:purchases.manage']);
        });

        $routes->group('registers', static function (RouteCollection $routes) {
            $routes->get('stores/assignable', 'RegistersController::assignableStores', ['filter' => 'permission:registers.view']);
            $routes->get('', 'RegistersController::index', ['filter' => 'permission:registers.view']);
            $routes->get('(:num)', 'RegistersController::show/$1', ['filter' => 'permission:registers.view']);
            $routes->post('', 'RegistersController::create', ['filter' => 'permission:registers.manage']);
            $routes->put('(:num)', 'RegistersController::update/$1', ['filter' => 'permission:registers.manage']);
            $routes->delete('(:num)', 'RegistersController::delete/$1', ['filter' => 'permission:registers.manage']);
        });

        $routes->group('cash-sessions', static function (RouteCollection $routes) {
            $routes->get('', 'CashSessionsController::index', ['filter' => 'permission:cash-sessions.view']);
            $routes->get('(:num)', 'CashSessionsController::show/$1', ['filter' => 'permission:cash-sessions.view']);
            $routes->get('(:num)/movements', 'CashSessionsController::movements/$1', ['filter' => 'permission:cash-sessions.view']);
            $routes->get('(:num)/summary', 'CashSessionsController::summary/$1', ['filter' => 'permission:cash-sessions.view']);
            $routes->post('open', 'CashSessionsController::open', ['filter' => 'permission:cash-sessions.manage']);
            $routes->post('(:num)/movements', 'CashSessionsController::addMovement/$1', ['filter' => 'permission:cash-sessions.manage']);
            $routes->post('(:num)/close', 'CashSessionsController::close/$1', ['filter' => 'permission:cash-sessions.manage']);
        });

        $routes->group('sales', static function (RouteCollection $routes) {
            $routes->get('', 'SalesController::index', ['filter' => 'permission:sales.view']);
            $routes->get('(:num)', 'SalesController::show/$1', ['filter' => 'permission:sales.view']);
            $routes->get('(:num)/items', 'SalesController::items/$1', ['filter' => 'permission:sales.view']);
            $routes->get('(:num)/receipt', 'SalesController::receipt/$1', ['filter' => 'permission:sales.view']);
            $routes->post('', 'SalesController::create', ['filter' => 'permission:sales.create']);
            $routes->post('(:num)/void', 'SalesController::void/$1', ['filter' => 'permission:sales.void']);
        });

        $routes->group('payments', static function (RouteCollection $routes) {
            $routes->get('', 'PaymentsController::index', ['filter' => 'permission:payments.view']);
            $routes->get('(:num)', 'PaymentsController::show/$1', ['filter' => 'permission:payments.view']);
        });

        $routes->group('payment-methods', static function (RouteCollection $routes) {
            $routes->get('', 'PaymentMethodsController::index', ['filter' => 'permission:payment-methods.view']);
            $routes->get('(:num)', 'PaymentMethodsController::show/$1', ['filter' => 'permission:payment-methods.view']);
            $routes->post('', 'PaymentMethodsController::create', ['filter' => 'permission:payment-methods.manage']);
            $routes->put('(:num)', 'PaymentMethodsController::update/$1', ['filter' => 'permission:payment-methods.manage']);
            $routes->delete('(:num)', 'PaymentMethodsController::delete/$1', ['filter' => 'permission:payment-methods.manage']);
        });

        $routes->group('returns', static function (RouteCollection $routes) {
            $routes->get('', 'ReturnsController::index', ['filter' => 'permission:returns.view']);
            $routes->get('eligible-items', 'ReturnsController::eligibleItems', ['filter' => 'permission:returns.create']);
            $routes->get('(:num)', 'ReturnsController::show/$1', ['filter' => 'permission:returns.view']);
            $routes->get('(:num)/items', 'ReturnsController::items/$1', ['filter' => 'permission:returns.view']);
            $routes->post('', 'ReturnsController::create', ['filter' => 'permission:returns.create']);
            $routes->put('(:num)', 'ReturnsController::update/$1', ['filter' => 'permission:returns.create']);
            $routes->post('(:num)/approve', 'ReturnsController::approve/$1', ['filter' => 'permission:returns.approve']);
            $routes->post('(:num)/reject', 'ReturnsController::reject/$1', ['filter' => 'permission:returns.approve']);
        });

        $routes->group('audit-logs', static function (RouteCollection $routes) {
            $routes->get('', 'AuditLogsController::index', ['filter' => 'permission:audit.view']);
            $routes->get('entity-types', 'AuditLogsController::entityTypes', ['filter' => 'permission:audit.view']);
            $routes->get('(:num)', 'AuditLogsController::show/$1', ['filter' => 'permission:audit.view']);
        });

        $routes->group('reports', static function (RouteCollection $routes) {
            // Step 38 — Dashboard
            $routes->get('dashboard', 'ReportsController::dashboard', ['filter' => 'permission:dashboard.view']);

            // Step 35 — Sales reports
            $routes->get('sales-summary', 'ReportsController::salesSummary', ['filter' => 'permission:reports.view']);
            $routes->get('daily-sales', 'ReportsController::dailySales', ['filter' => 'permission:reports.view']);
            $routes->get('monthly-sales', 'ReportsController::monthlySales', ['filter' => 'permission:reports.view']);
            $routes->get('store-sales', 'ReportsController::storeSales', ['filter' => 'permission:reports.view']);
            $routes->get('cashier-sales', 'ReportsController::cashierSales', ['filter' => 'permission:reports.view']);
            $routes->get('bagger-performance', 'ReportsController::baggerPerformance', ['filter' => 'permission:reports.view']);
            $routes->get('product-sales', 'ReportsController::productSales', ['filter' => 'permission:reports.view']);
            $routes->get('top-products', 'ReportsController::topProducts', ['filter' => 'permission:reports.view']);
            $routes->get('category-sales', 'ReportsController::categorySales', ['filter' => 'permission:reports.view']);
            $routes->get('payment-methods', 'ReportsController::paymentMethodSales', ['filter' => 'permission:reports.view']);

            // Step 36 — Inventory reports
            $routes->get('current-stock', 'ReportsController::currentStock', ['filter' => 'permission:reports.view']);
            $routes->get('low-stock', 'ReportsController::lowStock', ['filter' => 'permission:reports.view']);
            $routes->get('inventory-valuation', 'ReportsController::inventoryValuation', ['filter' => 'permission:reports.view']);
            $routes->get('stock-movement', 'ReportsController::stockMovement', ['filter' => 'permission:reports.view']);
            $routes->get('stock-adjustments', 'ReportsController::stockAdjustments', ['filter' => 'permission:reports.view']);
            $routes->get('stock-transfers', 'ReportsController::stockTransfers', ['filter' => 'permission:reports.view']);

            // Step 37 — VAT reports
            $routes->get('vat-summary', 'ReportsController::vatSummary', ['filter' => 'permission:reports.view']);
        });
    });
});
