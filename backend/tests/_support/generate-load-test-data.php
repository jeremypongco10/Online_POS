<?php

/**
 * Phase 24 load-test data generator. Bulk-loads the live pos_system
 * MySQL database with realistic volumes directly via batched multi-row
 * INSERT (bypassing the app/ORM entirely — this is about DB-level query
 * performance, not business logic, which is already covered by the
 * Phase 23 integration tests).
 *
 * Everything generated here is scoped under a single company whose
 * trade_name is prefixed "LoadTest " so it's trivially identifiable and
 * purgeable later: DELETE FROM companies WHERE trade_name LIKE 'LoadTest %'
 * (cascades to everything below it via FK ON DELETE CASCADE).
 *
 * Usage: php tests/_support/generate-load-test-data.php
 */

set_time_limit(0);

$env = parse_ini_file(__DIR__ . '/../../.env', false, INI_SCANNER_RAW);
$dbHost = trim($env['database.default.hostname'] ?? 'localhost');
$dbUser = trim($env['database.default.username'] ?? '');
$dbPass = trim($env['database.default.password'] ?? '');
$dbName = trim($env['database.default.database'] ?? '');
$dbPort = (int) ($env['database.default.port'] ?? 3306);

$db = new mysqli($dbHost, $dbUser, $dbPass, $dbName, $dbPort);
$db->set_charset('utf8mb4');

const PRODUCT_COUNT = 100_000;
const SALE_COUNT = 1_000_000;
const SALE_ITEMS_PER_SALE = 5;
const STORE_COUNT = 8;
const BATCH_SIZE = 4000;

$start = microtime(true);

echo "Disabling FK/unique checks and autocommit for bulk load...\n";
$db->query('SET foreign_key_checks = 0');
$db->query('SET unique_checks = 0');
$db->query('SET autocommit = 0');

// --- Company, stores, registers, a unit, a tax rate, a user ---
$companyName = 'LoadTest Co ' . date('Y-m-d H:i:s');
$db->query("INSERT INTO companies (trade_name, currency, timezone, is_active, created_at, updated_at)
    VALUES ('" . $db->real_escape_string($companyName) . "', 'PHP', 'Asia/Manila', 1, NOW(), NOW())");
$companyId = $db->insert_id;

$storeRows = [];
for ($i = 1; $i <= STORE_COUNT; $i++) {
    $storeRows[] = "({$companyId}, 'LoadTest Store {$i}', 'LT-{$i}', 1, NOW(), NOW())";
}
$db->query('INSERT INTO stores (company_id, name, code, is_active, created_at, updated_at) VALUES ' . implode(',', $storeRows));
$firstStoreId = $db->insert_id;
$storeIds = range($firstStoreId, $firstStoreId + STORE_COUNT - 1);

$registerRows = [];
foreach ($storeIds as $storeId) {
    $registerRows[] = "({$storeId}, 'LoadTest Register', 'LTR-{$storeId}', 1, NOW(), NOW())";
}
$db->query('INSERT INTO registers (store_id, name, code, is_active, created_at, updated_at) VALUES ' . implode(',', $registerRows));
$firstRegisterId = $db->insert_id;
$registerByStore = array_combine($storeIds, range($firstRegisterId, $firstRegisterId + STORE_COUNT - 1));

$db->query("INSERT INTO units (name, abbreviation, decimal_places, created_at, updated_at)
    VALUES ('LoadTest Piece', 'ltpc', 0, NOW(), NOW())");
$unitId = $db->insert_id;

$db->query("INSERT INTO tax_rates (company_id, name, rate, is_default, is_active, created_at, updated_at)
    VALUES ({$companyId}, 'VAT', 12.00, 1, 1, NOW(), NOW())");
$taxRateId = $db->insert_id;

$db->query("INSERT INTO roles (company_id, name, description, is_system, created_at, updated_at)
    VALUES ({$companyId}, 'LoadTest Role', 'Load-test only', 0, NOW(), NOW())");
$roleId = $db->insert_id;

$db->query("INSERT INTO users (company_id, role_id, name, email, username, password_hash, is_active, created_at, updated_at)
    VALUES ({$companyId}, {$roleId}, 'LoadTest User', 'loadtest-" . time() . "@example.com', 'loadtest_" . time() . "', '" . password_hash('LoadTest123!', PASSWORD_BCRYPT) . "', 1, NOW(), NOW())");
$userId = $db->insert_id;

$db->commit();
echo 'Setup done: company ' . $companyId . ', stores ' . $firstStoreId . '-' . ($firstStoreId + STORE_COUNT - 1)
    . ", registers {$firstRegisterId}+, unit {$unitId}, tax {$taxRateId}, user {$userId} (" . round(microtime(true) - $start, 1) . "s)\n";

// --- Products ---
echo 'Generating ' . PRODUCT_COUNT . " products...\n";
$t0 = microtime(true);
$rows = [];
$productSql = 'INSERT INTO products (company_id, unit_id, tax_rate_id, sku, name, minimum_stock, is_active, track_inventory, created_at, updated_at) VALUES ';
for ($i = 1; $i <= PRODUCT_COUNT; $i++) {
    $sku = 'LT-SKU-' . str_pad((string) $i, 7, '0', STR_PAD_LEFT);
    $rows[] = "({$companyId}, {$unitId}, {$taxRateId}, '{$sku}', 'LoadTest Product {$i}', 5, 1, 1, NOW(), NOW())";

    if (count($rows) >= BATCH_SIZE) {
        $db->query($productSql . implode(',', $rows));
        $rows = [];
    }
}
if ($rows !== []) {
    $db->query($productSql . implode(',', $rows));
}
$db->commit();
$firstProductId = (int) $db->query("SELECT MIN(id) m FROM products WHERE company_id = {$companyId}")->fetch_assoc()['m'];
echo 'Products done: first id ' . $firstProductId . ' (' . round(microtime(true) - $t0, 1) . "s)\n";

// --- Inventory: one row per product at its "home" store ---
echo "Generating inventory rows...\n";
$t0 = microtime(true);
$rows = [];
$priceRows = [];
$invSql = 'INSERT INTO inventory (product_id, store_id, quantity, reorder_level, created_at, updated_at) VALUES ';
$priceSql = 'INSERT INTO store_product_prices (product_id, store_id, cost_price, selling_price, created_at, updated_at) VALUES ';
for ($i = 0; $i < PRODUCT_COUNT; $i++) {
    $productId = $firstProductId + $i;
    $storeId = $storeIds[$i % STORE_COUNT];
    $qty = mt_rand(0, 500);
    $rows[] = "({$productId}, {$storeId}, {$qty}, 5, NOW(), NOW())";

    $cost = number_format(mt_rand(500, 50000) / 100, 2, '.', '');
    $price = number_format(((float) $cost) * 1.4, 2, '.', '');
    $priceRows[] = "({$productId}, {$storeId}, {$cost}, {$price}, NOW(), NOW())";

    if (count($rows) >= BATCH_SIZE) {
        $db->query($invSql . implode(',', $rows));
        $db->query($priceSql . implode(',', $priceRows));
        $rows = [];
        $priceRows = [];
    }
}
if ($rows !== []) {
    $db->query($invSql . implode(',', $rows));
    $db->query($priceSql . implode(',', $priceRows));
}
$db->commit();
echo 'Inventory + prices done (' . round(microtime(true) - $t0, 1) . "s)\n";

// --- Sales, spread over the last 730 days, mostly completed ---
echo 'Generating ' . SALE_COUNT . " sales...\n";
$t0 = microtime(true);
$statuses = ['completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'voided'];
$rows = [];
$saleSql = 'INSERT INTO sales (company_id, store_id, register_id, user_id, invoice_number, status, sale_date, subtotal, discount_total, tax_total, total, amount_paid, change_due, created_at, updated_at) VALUES ';
for ($i = 1; $i <= SALE_COUNT; $i++) {
    $storeId = $storeIds[array_rand($storeIds)];
    $registerId = $registerByStore[$storeId];
    $daysAgo = mt_rand(0, 730);
    $saleDate = date('Y-m-d H:i:s', strtotime("-{$daysAgo} days", $start) + mt_rand(0, 86399));
    $status = $statuses[array_rand($statuses)];
    $subtotal = number_format(mt_rand(10000, 500000) / 100, 2, '.', '');
    $tax = number_format(((float) $subtotal) * 0.12, 2, '.', '');
    $total = number_format(((float) $subtotal) + (float) $tax, 2, '.', '');
    $invoice = 'LT-INV-' . str_pad((string) $i, 8, '0', STR_PAD_LEFT);
    $rows[] = "({$companyId}, {$storeId}, {$registerId}, {$userId}, '{$invoice}', '{$status}', '{$saleDate}', {$subtotal}, 0, {$tax}, {$total}, {$total}, 0, NOW(), NOW())";

    if (count($rows) >= BATCH_SIZE) {
        $db->query($saleSql . implode(',', $rows));
        $rows = [];
        if ($i % 100000 === 0) {
            $db->commit();
            echo "  {$i} sales... (" . round(microtime(true) - $t0, 1) . "s)\n";
        }
    }
}
if ($rows !== []) {
    $db->query($saleSql . implode(',', $rows));
}
$db->commit();
$firstSaleId = (int) $db->query("SELECT MIN(id) m FROM sales WHERE company_id = {$companyId}")->fetch_assoc()['m'];
echo 'Sales done: first id ' . $firstSaleId . ' (' . round(microtime(true) - $t0, 1) . "s)\n";

// --- Sale items: ~5 per sale, referencing random products ---
echo "Generating sale_items (~5 per sale)...\n";
$t0 = microtime(true);
$rows = [];
$itemSql = 'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, tax_rate, tax_amount, line_total, created_at, updated_at) VALUES ';
$totalItems = 0;
for ($i = 0; $i < SALE_COUNT; $i++) {
    $saleId = $firstSaleId + $i;
    $itemCount = mt_rand(1, SALE_ITEMS_PER_SALE * 2 - 1);

    for ($j = 0; $j < $itemCount; $j++) {
        $productId = $firstProductId + mt_rand(0, PRODUCT_COUNT - 1);
        $qty = mt_rand(1, 5);
        $unitPrice = number_format(mt_rand(1000, 5000) / 100, 2, '.', '');
        $lineNet = round($qty * (float) $unitPrice, 2);
        $taxAmount = round($lineNet * 0.12, 2);
        $lineTotal = round($lineNet + $taxAmount, 2);
        $rows[] = "({$saleId}, {$productId}, {$qty}, {$unitPrice}, 0, 12.00, {$taxAmount}, {$lineTotal}, NOW(), NOW())";
        $totalItems++;

        if (count($rows) >= BATCH_SIZE) {
            $db->query($itemSql . implode(',', $rows));
            $rows = [];
        }
    }

    if (($i + 1) % 100000 === 0) {
        $db->commit();
        echo '  ' . ($i + 1) . " sales -> {$totalItems} items so far... (" . round(microtime(true) - $t0, 1) . "s)\n";
    }
}
if ($rows !== []) {
    $db->query($itemSql . implode(',', $rows));
}
$db->commit();
echo "Sale items done: {$totalItems} rows (" . round(microtime(true) - $t0, 1) . "s)\n";

echo "Re-enabling FK/unique checks and autocommit...\n";
$db->query('SET foreign_key_checks = 1');
$db->query('SET unique_checks = 1');
$db->query('SET autocommit = 1');

echo 'TOTAL TIME: ' . round(microtime(true) - $start, 1) . "s\n";
echo "Company id: {$companyId} (trade_name: {$companyName})\n";
