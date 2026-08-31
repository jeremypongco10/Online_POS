import { execFileSync } from 'node:child_process';
import { FIXTURE_TAG, MYSQL_BIN, dbConfig } from './support/env';

/** Sweeps every product any spec created (all tagged via uniqueTag(), see support/testData.ts) in one query, regardless of which spec created it or whether it failed partway through. The QA login user itself is left in place — recreating it is cheap (see global-setup) and it's clearly named as a fixture, not a real employee. */
export default async function globalTeardown() {
  const { host, user, password, database } = dbConfig();
  const sql = `DELETE FROM products WHERE company_id = 1 AND (sku LIKE '${FIXTURE_TAG}-%' OR barcode LIKE '${FIXTURE_TAG}-%');`;
  execFileSync(MYSQL_BIN, ['-u', user, `-p${password}`, '-h', host, database, '-e', sql]);
}
