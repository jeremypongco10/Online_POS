-- Run once, as root/admin, against the production MySQL server.
-- Creates a dedicated app user scoped to exactly what the API needs —
-- no CREATE/DROP/ALTER/GRANT, and no access to any schema but this
-- app's own. Migrations are run separately by a human with a more
-- privileged, short-lived connection (see DEPLOYMENT.md); the app
-- itself never needs schema-changing privileges at runtime.
--
-- Replace CHANGE_ME_* before running. Generate the password with
-- something like `openssl rand -base64 32`, then put it in the
-- server's .env as database.default.password — never in this file,
-- never committed anywhere.

CREATE DATABASE IF NOT EXISTS pos_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

CREATE USER IF NOT EXISTS 'pos_system_app'@'%'
  IDENTIFIED BY 'CHANGE_ME_generate_a_real_password';

GRANT SELECT, INSERT, UPDATE, DELETE
  ON pos_system.*
  TO 'pos_system_app'@'%';

-- Narrow '%' to the application server's actual IP/subnet once you
-- know it (or to 'localhost' if the app and DB run on the same host):
--   CREATE USER IF NOT EXISTS 'pos_system_app'@'10.0.0.0/255.255.255.0' ...

FLUSH PRIVILEGES;

-- --- Separate, more privileged user for running migrations only ---
-- Used by a human/CI pipeline at deploy time, never held open, never
-- put in the app's own .env.
--
-- CREATE USER IF NOT EXISTS 'pos_system_migrator'@'%'
--   IDENTIFIED BY 'CHANGE_ME_different_password';
-- GRANT ALL PRIVILEGES ON pos_system.* TO 'pos_system_migrator'@'%';
-- FLUSH PRIVILEGES;
