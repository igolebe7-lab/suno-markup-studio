# Separate VPS deployment under `/suno/`

The VPS deployment is the primary live instance as of 2026-09-30:
`https://147.45.136.245/suno/`. The legacy Render API is suspended, while
its PostgreSQL database and Vercel frontend are retained for rollback. Do not
resume the old API without first reconciling writes made on the VPS.
The production branch is `codex/sqlite-selfhost`, not `main`. Pushes to that
branch deploy automatically only when `SUNO_AUTO_DEPLOY=true` is set as a
GitHub repository variable and the restricted SSH setup below is installed.
The PostgreSQL schema and Render/Vercel commands remain available for rollback.
Do not use the Family Dashboard deploy key: it is restricted to Family operations.

The initial release is commit `aae41a0` in `/opt/suno/releases/aae41a0`,
with `/opt/suno/current` pointing to it. The migrated database contains
1 user, 3 projects, and 1 custom tag. Existing refresh sessions were not
copied, so users must sign in again. A verified online backup is in
`/var/backups/suno`; `suno-backup.timer` runs daily. Keep an additional
off-VPS encrypted backup: a copy on the same disk is not disaster recovery.

## Boundaries

- Suno: dedicated `suno` Linux user, Node/Fastify on `127.0.0.1:8787`, SQLite
  in `/var/lib/suno`, code in `/opt/suno`, backups in `/var/backups/suno`.
- Existing Family Caddy remains the **only** listener on ports 80/443. Add two
  `/suno/` handlers to its current `/etc/familytime/Caddyfile`, ahead of its
  `/api` and static catch-all handlers. Do not install or start a second Caddy.
- Family Dashboard, WireGuard, Amnezia, their files and services stay untouched.
- SQLite keeps users, Argon2 password hashes, projects, and custom tags.
  Refresh sessions are intentionally not migrated: everyone must log in again.
- Browser `localStorage` drafts are origin-scoped and cannot be copied by the
  server-side database migration. Export unsaved drafts from the old site first.
- The existing IP HTTPS certificate must be valid in the browser. There is no
  separate domain in this deployment.

## 1. Access and preflight

Use a new SSH key and a separate `suno-admin` account with sudo. Do **not** send
passwords or private keys in chat, GitHub, or shell history. Rotate any password
previously pasted into a conversation before granting access. The public SSH key
may be shared. Test key login in a second terminal before changing SSH settings.

Read-only checks on the VPS:

```sh
uname -m
cat /etc/os-release
openssl version
free -m
df -h /
systemctl is-active familytime-caddy familytime-pocketbase wg-quick@wg0
systemctl status familytime-caddy --no-pager
ss -ltnp
sudo cat /etc/familytime/Caddyfile
```

Also identify the Amnezia service/container and confirm it is healthy. Confirm
that TCP 8787 is unused, the host is Linux x86-64 with a compatible OpenSSL 3
runtime for the packaged Prisma engine, Caddy can read `/opt/suno`,
and there is sufficient RAM/disk for a Node process plus two releases and
backups. The prior reported 1 GiB RAM / no swap is a risk: do not proceed if
available memory is substantially lower or the host is already swapping/OOMing.
There is no host-side compilation in this runbook.

Take a fresh, restorable Family backup with its **existing** procedure and
preserve a copy of `/etc/familytime/Caddyfile` before editing it. Do not change
Family's app code, PocketBase DB, WireGuard, Amnezia, firewall, or TLS files.

## 2. Build a Linux release

The GitHub Actions workflow `.github/workflows/suno-selfhost.yml` builds
and tests on Ubuntu 24.04 x86-64 with Node 24. It packages a Linux Node binary,
Linux-native Argon2 and Prisma dependencies, compiled API, static web app,
SQLite schema/migrations, and backup script. Do not copy macOS `node_modules`
to the VPS. On a reviewed push to `codex/sqlite-selfhost`, the deploy job
streams the artifact over SSH only after build, unit, and browser tests pass.
For manual recovery, trigger the workflow, download the artifact with
`gh run download`, and verify its Git commit. Keep archives outside the repo.

Local verification before triggering the workflow:

```sh
npm test
npm run selfhost:build
npm run e2e
```

The web build uses base `/suno/`; its API base is `/suno`, so browser requests
go to `/suno/api/*` on the same HTTPS origin. The Caddy route strips only
`/suno`, leaving the backend's `/api/*` routes intact.

## 3. Prepare the VPS, without switching traffic

After preflight, create `suno` as a system user with no login shell. Install
`sqlite3` for online backup and verification. Prepare directories:

```sh
sudo install -d -o root -g root -m 0755 /opt/suno/releases
sudo install -d -o suno -g suno -m 0700 /var/lib/suno /var/backups/suno
sudo install -d -o root -g root -m 0700 /etc/suno
```

Unpack the verified Linux archive into a **new** directory such as
`/opt/suno/releases/<commit-sha>`; do not overwrite an existing release. Keep
release code owned by root and readable by the Caddy and Suno services. Copy
`deploy/suno.env.example` to `/etc/suno/suno.env`, replace `YOUR_SERVER_IP`,
and set mode 0600. Use `WEB_ORIGINS=https://<IP>` (origin, without `/suno/`),
`COOKIE_PATH=/suno/api`, `COOKIE_SAME_SITE=lax`, `COOKIE_SECURE=true`, and
`DATABASE_URL=file:/var/lib/suno/suno.db`. The API binds localhost only.

Install `deploy/suno.service`, `deploy/suno-backup.service`, and
`deploy/suno-backup.timer` as dedicated systemd units; run `systemctl
daemon-reload`. Do not enable or start Suno until data migration and route
validation are complete. Never reuse or modify Family service units.

## 4. Migrate user data during a write freeze

Schedule a short maintenance window. Make a verified Supabase backup first.
Stop writes to the **old Render API** (including its Vercel proxy) before the
final read. Pausing only the browser UI is not a write freeze. Keep the old
database and deployment for rollback, but do not let both backends accept
writes after cutover.

On a trusted workstation, use a fresh, disposable SQLite path. Keep the
Supabase URL in a protected environment variable, never in a committed file
or command history. The source URL must use the PostgreSQL `postgresql://`
scheme. If the pooler uses Supabase's private CA, download the certificate
from the project's Database Settings and set
`SOURCE_DATABASE_CA_FILE=/absolute/path/to/prod-ca-2021.crt`. The migrator
verifies the server certificate; do not disable TLS verification. Then run:

```sh
npm run prisma:generate:sqlite
DATABASE_URL=file:/absolute/path/to/fresh-suno.db npm run prisma:deploy:sqlite
DATABASE_URL=file:/absolute/path/to/fresh-suno.db \
  MIGRATION_WRITE_FREEZE_CONFIRMED=yes \
  node scripts/migrate-postgres-to-sqlite.mjs
```

`SOURCE_DATABASE_URL` must already be exported securely in that shell. The
script uses a read-only, repeatable-read PostgreSQL transaction, batches rows,
checks row counts and SHA-256 content fingerprints against SQLite, and refuses
to write into a nonempty destination. It prints counts, not credentials or
row contents. It does not copy refresh tokens. If it fails, discard **only**
the disposable destination and rerun from a fresh file. Do not overwrite the
source database.

Verify the SQLite file before transfer:

```sh
sqlite3 /absolute/path/to/fresh-suno.db 'PRAGMA integrity_check;'
sqlite3 /absolute/path/to/fresh-suno.db 'PRAGMA foreign_key_check;'
```

Expected: `ok` from the first command and no rows from the second. Transfer
the verified file securely to the VPS. Before first installation, verify
`/var/lib/suno/suno.db` does not exist; install the transferred file owned by
`suno:suno` with mode 0600. Keep an off-VPS encrypted copy. Apply SQLite
migrations from the new release using its packaged Node + Prisma CLI; an
already migrated database should report no pending migrations.

## 5. Route and cutover

The production Caddyfile belongs to Family. Add the following **inside the
existing HTTPS `route` block**, before Family's `@admin`, `/api/*`, and static
catch-all handlers. Preserve the surrounding TLS, headers, and routes:

```caddyfile
redir /suno /suno/ 308
handle /suno/api/* {
    uri strip_prefix /suno
    reverse_proxy 127.0.0.1:8787
}
handle_path /suno/* {
    root * /opt/suno/current/apps/web/dist
    try_files {path} /index.html
    file_server
}
```

The local fixture `deploy/Caddyfile.localtest` was validated with `caddy
adapt` and HTTP requests. On the VPS, validate the **full** edited Family
config with the installed Caddy binary and its public env, then reload only
`familytime-caddy.service`. If validation fails, restore the backed-up Caddyfile
without reloading. Never restart Caddy blindly.

Point `/opt/suno/current` to the new release; start only `suno.service`.
Check `systemctl status suno`, `journalctl -u suno`, and localhost
`http://127.0.0.1:8787/api/health`. Then verify externally:

```sh
curl -f https://YOUR_SERVER_IP/suno/api/health
curl -I https://YOUR_SERVER_IP/suno/
```

In a browser, log in with an existing migrated account, open saved projects,
create/update/delete a test project and a custom tag, reload and log in again.
Check cookie path `/suno/api` and no writes/cookies affecting Family. Verify
Family login and API, WG, and Amnezia again. Enable `suno-backup.timer` only
after the first manual backup succeeds and a restore drill is documented.

## Backups, updates, rollback

### Automatic deployment

`deploy/install-auto-deploy.sh` creates a dedicated `suno-deploy` account.
Its `authorized_keys` entry permits only `suno-receive-release`; SSH forwarding,
PTYs, and arbitrary commands are disabled. The receiver checks the full Git
commit ID, SHA-256 digest, and 750 MiB upload limit. Sudo permits only
`suno-activate-release` with no arguments. The GitHub Actions private key is
stored only in the `SUNO_DEPLOY_SSH_KEY` secret; `SUNO_DEPLOY_KNOWN_HOSTS`
pins the VPS Ed25519 host key. Set `SUNO_AUTO_DEPLOY=true` only after the
server account, secrets, and host key have been verified.

Each release is extracted to a new directory. The installer stops only
`suno.service`, creates and verifies a SQLite snapshot, applies SQLite
migrations, switches `/opt/suno/current`, then waits for API and public-page
health. A failure restores the snapshot and previous release. It does not
modify Caddy, Family, WireGuard, or Amnezia. Predeploy snapshots remain in
`/var/backups/suno` until backup retention is reviewed. Keep the current and
previous code releases for rollback; older archives can be rebuilt from
GitHub and should be removed after a successful release.

The initial setup requires an administrator to run the installer once with
the Actions **public** key. Confirm the host fingerprint from an already
trusted connection before setting the GitHub secret. Never commit or copy
the private key to the VPS. When deploy scripts change, reinstall the
root-owned scripts on the VPS before enabling a push that depends on them.
If deployment fails, inspect the GitHub job and `journalctl -u suno.service`,
then disable `SUNO_AUTO_DEPLOY` until corrected.

### Manual operations

`scripts/backup-sqlite.sh` uses SQLite's online `.backup` API, verifies
`integrity_check`, and writes a timestamped file in `/var/backups/suno`.
Schedule it via the provided timer and copy backups **off the VPS**. A backup
on the same disk is not disaster recovery. Monitor free space and retain
backups according to an explicit policy; this script does not silently delete
old backups. Never copy a live SQLite `.db` alone while a WAL file may exist.

For updates: build/test a new Linux release, back up SQLite, stop Suno only,
apply SQLite migrations, switch `/opt/suno/current` to the new release,
restart Suno, and smoke-test both Suno and Family. Do not restart Family, WG,
or Amnezia. For application-only rollback, point `current` back to the prior
release. If a database migration must also be rolled back, stop Suno and
restore the verified pre-update SQLite snapshot **including handling any
`.db-wal`/`.db-shm` files**; do not swap DB files while the service is live.
Keep the PostgreSQL source backup until data and login verification is complete.
