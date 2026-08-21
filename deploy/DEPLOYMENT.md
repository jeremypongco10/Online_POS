# Deployment

```
React (static build)  ->  Nginx / Apache  ->  CodeIgniter API (PHP-FPM)  ->  MySQL
```

Nginx terminates TLS and serves two things: the React build as static
files, and `/api` (on a separate subdomain, `api.yourdomain.com`)
proxied to PHP-FPM running the CodeIgniter app. MySQL is not exposed
publicly — only reachable from the app server.

## 1. HTTPS

Nginx terminates TLS; the app itself only ever sees plain HTTP from
the proxy on localhost. See `nginx.conf.example` — get certs with
certbot (`certbot --nginx -d app.yourdomain.com -d api.yourdomain.com`)
before enabling the HTTPS server blocks.

Once TLS is live, set in the backend's `.env`:
```
app.forceGlobalSecureRequests = true
```
This redirects any stray HTTP request to HTTPS and sends HSTS. Turning
it on *before* TLS is actually terminated in front of the app causes a
redirect loop — order matters.

Because Nginx sits in front of the app, also set `app.proxyIPs` (see
`.env.example`) so CodeIgniter reads the real client IP from
`X-Forwarded-For` — without it, every request looks like it comes from
the Nginx box itself, which breaks `RateLimitFilter` (keyed by IP) and
any IP-based log analysis.

## 2. Environment variables

`backend/.env.example` documents every variable production needs, with
no real secrets committed anywhere. Copy it to `.env` on the server
and fill in real values — `.env` is gitignored, so it's set once
per-server, or better, injected by whatever deploy/secrets tooling
you're already using (avoid hand-editing on the box if you can help
it — no audit trail).

Generate secrets fresh for production, never reuse dev's:
```
php spark key:generate        # encryption.key
openssl rand -hex 32          # JWT_SECRET
openssl rand -hex 32          # SESSION_SECRET (different from JWT_SECRET)
```

## 3. Database backups

`backup-database.sh` does a `mysqldump --single-transaction` (safe
against InnoDB without locking tables mid-checkout), gzips it,
verifies it isn't empty, and prunes anything older than
`RETENTION_DAYS` (default 14). Reads DB credentials straight from
`backend/.env` — nothing to duplicate/keep in sync.

Cron, daily at 2am:
```
0 2 * * * /var/www/pos-system/deploy/backup-database.sh >> /var/log/pos-backup.log 2>&1
```

Restore:
```
gunzip -c backups/pos_system_2026-08-16_020000.sql.gz | mysql -u pos_system_app -p pos_system
```

Copy backups off the app server too (S3/rsync/whatever your platform
gives you) — a backup that lives on the same disk as the database it's
backing up doesn't survive that disk failing.

## 4. Error logging

`app/Libraries/ApiExceptionHandler.php` already renders every uncaught
exception as the API's normal JSON envelope and logs it at `critical`
— API responses never leak a stack trace or file path once
`CI_ENVIRONMENT=production` (verified during the Phase 22 security
review). Nothing to configure here beyond setting `CI_ENVIRONMENT`
correctly.

## 5. Application logging

`app/Filters/RequestLoggerFilter.php` logs every request (method,
path, status, duration, authenticated user) at `info` level.
`app/Config/Logger.php`'s production threshold is `[1,2,3,4,7]` —
every error tier *plus* Info, so this audit trail actually reaches
`writable/logs/` instead of being silently dropped by a plain numeric
cutoff (a bare `threshold = 4` would exclude Info entirely, since 7 >
4). Warnings/notices/debug stay excluded as noise at production scale.

CodeIgniter never rotates its own log files — install
`pos-system.logrotate` at `/etc/logrotate.d/pos-system` or they grow
forever.

## 6. CORS

`app/Config/Cors.php` always allows the two local dev origins
(`localhost:5173` / `127.0.0.1:5173`); the production frontend
origin(s) come from `CORS_ALLOWED_ORIGIN` in `.env` — comma-separated
if there's more than one. Never set this to `*`: `supportsCredentials`
is `true` (needed since the frontend sends `Authorization: Bearer`),
and browsers reject a wildcard origin combined with credentials
anyway.

## 7. Rate limiting

`app/Filters/RateLimitFilter.php`, backed by CodeIgniter's built-in
token-bucket `Throttler` — no extra infrastructure needed (uses
whatever `Config\Cache` handler is configured; file cache by default).
Two tiers, already wired into `Config\Filters.php` / `Routes.php`:

- **Global**: 300 requests/minute per IP across the whole API.
- **`/auth/login`**: 10 requests/5min per IP.
- **`/auth/refresh`**: 20 requests/5min per IP.

This is IP-based and complements, not replaces, the existing
per-account lockout (`UserModel::registerFailedLogin` — locks one
account after repeated bad passwords). The rate limiter catches what
per-account lockout can't: a distributed guess across many accounts
from one IP, or general API scraping.

**Multi-instance note**: file cache is per-server. If you ever run
more than one app instance behind a load balancer, point
`Config\Cache` at Redis/Memcached so all instances share the same
token buckets — otherwise each instance enforces the limit
independently, and the effective limit becomes (configured limit) ×
(instance count).

## 8. Production database credentials

`create-production-db-user.sql` creates a dedicated `pos_system_app`
user with only `SELECT, INSERT, UPDATE, DELETE` on `pos_system.*` — no
`CREATE`/`DROP`/`ALTER`/`GRANT`, and no access to any other schema.
Run it once as root/admin on the production MySQL server, put the
generated password in `.env` (never in the SQL file, never committed).

Migrations need more privilege than the app's own runtime user should
ever hold. Run them with a separate, more-privileged user, held open
only for the deploy:
```
php spark migrate --env production
```
using a temporary elevated connection (the SQL file has a commented-out
template for a `pos_system_migrator` user) — then go back to the
locked-down `pos_system_app` credentials in `.env` for normal running.

Never reuse local dev credentials in production, and never commit a
real production password anywhere — `.env` is gitignored precisely so
this mistake is hard to make by accident.

## 9. Frontend build

Vite bakes in `VITE_API_URL` at build time — there's no runtime env var
support for a static build. Copy `frontend/.env.production.example` to
`frontend/.env.production` (gitignored) with the real API URL, then:
```
npm run build
```
Deploy the resulting `dist/` to wherever Nginx's frontend `root`
points (see `nginx.conf.example`). A URL change means a rebuild, not
just an env var flip on the server.
