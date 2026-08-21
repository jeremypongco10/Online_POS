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

echo "Built {$dbFile}\n";
