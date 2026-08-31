import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Path to the XAMPP mysql.exe CLI — the same binary used everywhere else in this project's dev workflow (no MySQL client npm package needed just for test fixtures). */
export const MYSQL_BIN = 'C:/xampp/mysql/bin/mysql.exe';

const ENV_PATH = path.join(import.meta.dirname, '../../../../backend/.env');

function readEnvValue(key: string): string {
  const content = readFileSync(ENV_PATH, 'utf-8');
  const line = content.split('\n').find((l) => l.trim().startsWith(`${key} =`) || l.trim().startsWith(`${key}=`));
  if (!line) throw new Error(`Missing "${key}" in ${ENV_PATH}`);
  return line.split('=').slice(1).join('=').trim();
}

/** Reuses the backend's own MySQL credentials rather than duplicating the secret in a second place. */
export function dbConfig() {
  return {
    host: readEnvValue('database.default.hostname'),
    user: readEnvValue('database.default.username'),
    password: readEnvValue('database.default.password'),
    database: readEnvValue('database.default.database'),
  };
}

export const QA_EMAIL = 'qa.regression@pos-system.local';
export const QA_USERNAME = 'qa_regression';
export const QA_PASSWORD = 'TestPass123!';
// bcrypt hash of QA_PASSWORD (PASSWORD_BCRYPT), generated once — fixed
// rather than regenerated per run so setup only has to shell out to
// mysql.exe, not also to PHP.
export const QA_PASSWORD_HASH = '$2y$10$6ur6nFhC4Oajf./tJbGd1.SY61slPoLtCipnx/X4d4XFmC.3YF/Wy';

/** Every product this suite creates uses an sku/barcode starting with this — lets global-teardown sweep all of it in one query regardless of which spec created it. */
export const FIXTURE_TAG = 'PWQA';
