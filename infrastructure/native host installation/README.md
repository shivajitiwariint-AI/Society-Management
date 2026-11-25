# Native host installation

> The folder name `native host installation` is intentionally URL-encoded in links (`native%20host%20installation`) because it mirrors the SRS §11.3 project tree. Do not rename it.

This deployment installs Node.js, MySQL 8, and the application **directly on the host operating system**. There is no Docker, Compose, container service, SQLite, PostgreSQL, or managed cloud database (SRS §10, §11.3). nginx terminates TLS and proxies to the app on `127.0.0.1:3000`.

## 1. Host prerequisites

- Node.js 24 (`node -v` → v24.x) and npm.
- MySQL Server 8.0 running as a native service, bound to `127.0.0.1` (or a private IP, never the public internet).
- nginx with a valid TLS certificate.
- A dedicated OS account for the web process and a protected directory for `.env`/secrets and private files.
- `mysql`/`mysqldump` clients on `PATH` for migrations and backups.

## 2. Install the application

As the deployment account, from the repository root:

```bash
npm ci
npm run prisma:generate
npm run prisma:deploy     # committed migrations only
npm run build
```

`db:seed` is for initial bootstrap (Super Admin and reference module data) and should be run once with the same `DATABASE_URL`; remove/rotate bootstrap credentials after first login. Keep a production `.env` outside source control with:

- `NODE_ENV=production`
- `DATABASE_URL` for the single MySQL user (`society_app`), scoped only to `society_management`
- generated `SESSION_COOKIE_SECRET` and `CSRF_SECRET`
- `PRIVATE_STORAGE_DIR` outside the public web root
- `APP_URL=https://<public-host>`, `PORT=3000`

Restrict file permissions: `chmod 600 .env` on Linux; restrict ACLs to the service account on Windows. The app process must not have credentials for unrelated databases or public cloud storage.

## 3. Windows service

Install a service wrapper (for example NSSM) and configure it to start the built Next.js app. Run from an elevated shell:

```powershell
nssm install society-web "C:\Program Files\nodejs\npm.cmd"
nssm set society-web AppParameters "run start --workspace @society/web"
nssm set society-web AppDirectory "E:\Demo Website\Society Management"
nssm set society-web AppEnvironmentExtra NODE_ENV=production PORT=3000
nssm set society-web Start SERVICE_AUTO_START
nssm start society-web
```

Inject non-secret settings via the wrapper or a protected env file; do not put passwords in command-line arguments. Restrict the registry/service configuration to administrators. Verify with:

```powershell
Get-Service society-web
Invoke-WebRequest -Uri http://127.0.0.1:3000/ -UseBasicParsing
```

Stop/start for maintenance: `Stop-Service society-web` / `Start-Service society-web`.

## 4. Linux systemd

Create `/etc/systemd/system/society-management.service` (adjust user, paths, and `npm` location):

```ini
[Unit]
Description=Society Management Web
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=society
Group=society
WorkingDirectory=/opt/society-management
EnvironmentFile=/etc/society-management/app.env
ExecStart=/usr/bin/npm run start --workspace @society/web
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now society-management
sudo systemctl status society-management
curl -fsS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
```

Keep `/etc/society-management/app.env` mode `0600`, owned by `society`. Use `npm run prisma:deploy` with the migration user when deploying new committed migrations; never let the runtime user change schema.

## 5. TLS termination with nginx

Install [`../nginx/society-management.conf`](../nginx/society-management.conf) into `/etc/nginx/conf.d/` (or `sites-enabled`), replace `society.example.com` and certificate paths, then:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

nginx provides TLS 1.2/1.3, HSTS, CSP, and other security headers, rate-limit zones, and proxies to `127.0.0.1:3000`. It deliberately has **no `root`/`alias` for private storage, backups, or the repository**: sensitive documents are served only through authenticated, authorized application routes (SRS §18). Redirect HTTP to HTTPS; do not expose port 3000 publicly.

## 6. Firewall and network rules

MySQL must listen only on `127.0.0.1` for a single-host deployment. If a private DB host is used, bind only to its private interface, require TLS, and allow port 3306 solely from the app host.

Windows (elevated PowerShell):

```powershell
New-NetFirewallRule -DisplayName "Society HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Society HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
New-NetFirewallRule -DisplayName "Block MySQL inbound" -Direction Inbound -Protocol TCP -LocalPort 3306 -Action Block
```

Linux (ufw):

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3306/tcp
sudo ufw enable
sudo ufw status verbose
```

On cloud or perimeter firewalls, also block 3306 and 3000 from the public internet. Verify with `ss -lntp` (Linux) or `Get-NetTCPConnection -LocalPort 3306` (Windows).

## 7. Post-install checks

1. `curl -I https://<public-host>/` returns 200/redirect with security headers and CSP.
2. Login works; Super Admin requires MFA; company context is derived from membership.
3. MySQL ping and app health checks pass (see [`docs/runbook.md`](../../docs/runbook.md)).
4. A disabled module is rejected via direct URL and API; historical data remains read-only for authorized users.
5. A scheduled backup completes and a restore drill to a test schema succeeds ([`../backup/README.md`](../backup/README.md)).
