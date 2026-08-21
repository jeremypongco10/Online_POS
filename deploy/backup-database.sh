#!/usr/bin/env bash
#
# Nightly MySQL backup for pos_system. Dumps to a timestamped, gzipped
# file, verifies it isn't empty/truncated, and prunes backups older
# than RETENTION_DAYS. Reads DB credentials straight out of the app's
# own .env so there's exactly one place they're configured.
#
# Usage:
#   ./backup-database.sh                    # backs up, keeps last 14 days
#   RETENTION_DAYS=30 ./backup-database.sh   # override retention
#
# Cron (daily at 2am), from the backend/ directory:
#   0 2 * * * /var/www/pos-system/deploy/backup-database.sh >> /var/log/pos-backup.log 2>&1
#
# Restore:
#   gunzip -c backups/pos_system_2026-08-16_020000.sql.gz | mysql -u pos_system_app -p pos_system

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../backend/.env"
BACKUP_DIR="${SCRIPT_DIR}/../backend/writable/backups"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found — can't read DB credentials." >&2
    exit 1
fi

read_env() {
    grep -E "^$1\s*=" "$ENV_FILE" | tail -1 | sed -E "s/^$1\s*=\s*//; s/^['\"]|['\"]$//g"
}

DB_HOST="$(read_env 'database\.default\.hostname')"
DB_PORT="$(read_env 'database\.default\.port')"
DB_NAME="$(read_env 'database\.default\.database')"
DB_USER="$(read_env 'database\.default\.username')"
DB_PASS="$(read_env 'database\.default\.password')"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y-%m-%d_%H%M%S)"
OUT_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Backing up ${DB_NAME}@${DB_HOST}:${DB_PORT} -> ${OUT_FILE}"

# --single-transaction: consistent InnoDB snapshot without locking tables
# (this app is read/write heavy — a table-locking dump would stall checkout
# for however long the dump takes). --routines/--triggers: none exist
# today, included so a future one wouldn't silently be missed.
MYSQL_PWD="$DB_PASS" mysqldump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    --no-tablespaces \
    "$DB_NAME" | gzip > "$OUT_FILE"

SIZE=$(stat -c%s "$OUT_FILE" 2>/dev/null || stat -f%z "$OUT_FILE")
if [ "$SIZE" -lt 1024 ]; then
    echo "ERROR: backup file is suspiciously small (${SIZE} bytes) — treating as failed." >&2
    rm -f "$OUT_FILE"
    exit 1
fi

echo "[$(date)] Backup OK: $(du -h "$OUT_FILE" | cut -f1)"

echo "[$(date)] Pruning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete

echo "[$(date)] Done. $(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" | wc -l) backup(s) retained."
