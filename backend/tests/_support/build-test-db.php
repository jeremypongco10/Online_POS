<?php

/**
 * One-off setup: builds the SQLite file used by the `tests` DB group by
 * running every real app migration against it, in a fresh PHP process.
 *
 * Why this exists rather than letting DatabaseTestTrait migrate inline:
 * a couple of migrations rename a column under SQLite (companies.name ->
 * trade_name, customers.phone -> mobile), which CI4's SQLite driver
 * emulates by renaming the table aside, recreating it, copying data, and
 * dropping the old copy. That leaves the *same* PHP process's SQLite3
 * connection with a stale prepared-statement/schema cache — later
 * queries in that same process intermittently fail with
 * "no such table: main.temp_<table>", even though the on-disk schema is
 * completely correct afterward (confirmed by inspecting the file with a
 * separate connection). Building the schema once here, in its own
 * process, and having tests open a fresh connection to the finished file
 * sidesteps that stale-cache issue entirely.
 *
 * Run manually after a migration changes: php tests/_support/build-test-db.php
 */

$dbFile = __DIR__ . '/../../writable/tests.db';
if (is_file($dbFile)) {
    unlink($dbFile);
}

putenv('CI_ENVIRONMENT=testing');
$_SERVER['CI_ENVIRONMENT'] = 'testing';

require __DIR__ . '/../../vendor/codeigniter4/framework/system/Test/bootstrap.php';

$db = Config\Database::connect('tests');
$db->initialize();

$migrations = service('migrations');
$migrations->setNamespace(null);
$migrations->latest('tests');

/**
 * Repair pass for a second SQLite-only side effect of the same rename-aside
 * dance described above: when some OTHER table has a foreign key pointing
 * at the table being altered, CI4's SQLite Forge doesn't fix that other
 * table's own CREATE TABLE text back up afterward — it's left permanently
 * referencing the aside name (e.g. `products` getting dropColumn'd via
 * 2026-08-18-000051_DropProductPriceColumns leaves `inventory`,
 * `sale_items`, etc. still saying `REFERENCES "temp_products"(id)`). That
 * table is otherwise completely normal; the stale FK text only bites the
 * first time SQLite actually needs to resolve it — an insert, or a delete
 * that cascades through it — which fails with "no such table: main.temp_
 * <name>" even though `SELECT * FROM sqlite_master` looks fine. Known
 * CI4/SQLite limitation, not specific to any one migration, so this checks
 * for it generically rather than hard-coding the products/inventory case.
 *
 * Safe to fix by dropping and recreating the affected tables (+ their
 * indexes) here because nothing has inserted a row yet at this point in
 * the build — this runs immediately after migrate(), before any test does.
 *
 * Quoting style isn't consistent between corruption instances — the
 * original products/inventory case used double quotes
 * (`"temp_products"`), but a later modifyColumn() elsewhere produced
 * backtick-quoted text (`` `temp_sale_items` ``) instead, which the
 * double-quote-only pattern this started with silently missed (a real
 * miss, caught by manually inspecting a table this generic pass had
 * skipped). The SELECT and the fix-up regex below both match either
 * quote style (or none) rather than assuming one.
 */
$stale = $db->query("SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'table' AND sql LIKE '%temp\\_%' ESCAPE '\\'")->getResultArray();

if ($stale !== []) {
    $db->query('PRAGMA foreign_keys = OFF');

    foreach ($stale as $row) {
        $fixedSql = preg_replace('/["`]?temp_([a-zA-Z0-9_]+)["`]?/', '`$1`', $row['sql']);
        $indexes = $db->query('SELECT sql FROM sqlite_master WHERE type = \'index\' AND tbl_name = ? AND sql IS NOT NULL', [$row['tbl_name']])->getResultArray();

        $db->query("DROP TABLE `{$row['tbl_name']}`");
        $db->query($fixedSql);
        foreach ($indexes as $index) {
            $db->query($index['sql']);
        }

        echo "Repaired stale foreign-key text in: {$row['tbl_name']}\n";
    }

    $db->query('PRAGMA foreign_keys = ON');

    $violations = $db->query('PRAGMA foreign_key_check')->getResultArray();
    if ($violations !== []) {
        fwrite(STDERR, "Repair left foreign_key_check violations:\n" . print_r($violations, true));
        exit(1);
    }
}

echo "Built {$dbFile}\n";
