import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, type FullConfig } from '@playwright/test';
import { MYSQL_BIN, QA_EMAIL, QA_PASSWORD, QA_PASSWORD_HASH, QA_USERNAME, dbConfig } from './support/env';

const AUTH_FILE = path.join(import.meta.dirname, '.auth/qa-user.json');

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:5173';
  const backendURL = 'http://localhost:8080';

  // Fail fast with one clear message instead of every test in the suite
  // timing out individually against a backend that was never running.
  try {
    await fetch(`${backendURL}/api/v1/auth/login`, { method: 'POST' });
  } catch {
    throw new Error(
      `Backend not reachable at ${backendURL} — start it with \`php spark serve --port 8080\` ` +
        '(and make sure MySQL is running) before running the e2e suite.',
    );
  }

  // Ensure the QA fixture account exists — idempotent upsert, safe to run
  // on every invocation. This is a real row in the dev database (there's
  // no self-serve signup endpoint to provision an isolated one), clearly
  // named so it reads as a fixture rather than a real employee.
  const { host, user, password, database } = dbConfig();
  const sql =
    `INSERT INTO users (company_id, role_id, name, email, username, password_hash, is_active, created_at, updated_at) ` +
    `VALUES (1, 1, 'QA Regression Tester', '${QA_EMAIL}', '${QA_USERNAME}', '${QA_PASSWORD_HASH}', 1, NOW(), NOW()) ` +
    `ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = 1;`;
  execFileSync(MYSQL_BIN, ['-u', user, `-p${password}`, '-h', host, database, '-e', sql]);

  // Log in through the real UI once; every spec reuses this storage state
  // instead of re-logging in per file.
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseURL}/login`);
  await page.getByLabel(/Email or Username/i).fill(QA_EMAIL);
  await page.getByLabel(/Password/i).fill(QA_PASSWORD);
  await page.getByRole('button', { name: /Sign in/i }).click();
  await page.getByRole('heading', { name: 'Dashboard' }).first().waitFor({ timeout: 20_000 });

  mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
  await browser.close();
}

export { AUTH_FILE };
