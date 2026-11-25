# Operations runbook

Scope: local/self-hosted MySQL 8, one Next.js web process behind nginx, private file storage outside the web root. Backup retention, RPO, and RTO are **pending product owner** (SRS §24.9); use the configured defaults until targets are approved.

## 1. Health checks

| Check | Command / action | Expected |
| --- | --- | --- |
| Web process | `curl -fsS -o NUL -w "%{http_code}" http://127.0.0.1:3000/` (Windows) or `curl -fsS -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/` (Linux) | `200` or a redirect to the login page; no 5xx |
| Public entry point | `curl -I https://<host>/` | TLS valid, security headers and CSP present, no plugin/public-file route |
| MySQL | `mysqladmin -h 127.0.0.1 -u society_app -p ping` | `mysqld is alive` |
| Database query | `mysql -h 127.0.0.1 -u society_app -p -e "SELECT 1;" society_management` | `1` |
| Disk | Check web, MySQL data, backup, and private storage volumes | Free space above operational threshold; alert on growth |
| Backups | Inspect latest timestamped file in backup directory and scheduler logs | A successful dump within the expected interval |
| Logs | Review structured application logs and nginx error log | No repeated auth/RBAC failures or 5xx spikes |

Investigate failed backups, disk capacity, and service errors as release-blocking operational alerts (SRS §17.2).

## 2. Backup

Scripts are in `infrastructure/backup`; see the [backup README](../infrastructure/backup/README.md) for scheduling details. They use `mysqldump` with credentials from the single `DATABASE_URL`, write a UTC timestamped `.sql` file, and delete files older than `BACKUP_RETENTION_DAYS`.

Windows:

```powershell
$env:DATABASE_URL = 'mysql://society_app:<password>@127.0.0.1:3306/society_management'
$env:BACKUP_DIR = 'E:\backups\society-management'
$env:BACKUP_RETENTION_DAYS = '14'
powershell -ExecutionPolicy Bypass -File .\infrastructure\backup\backup-mysql.ps1
```

Linux:

```bash
export DATABASE_URL='mysql://society_app:<password>@127.0.0.1:3306/society_management'
export BACKUP_DIR=/var/backups/society-management
export BACKUP_RETENTION_DAYS=14
bash infrastructure/backup/backup-mysql.sh
```

The same MySQL user is used by the app, migrations, seed and backups. Its grants are scoped only to the `society_management` database; no global privileges or credentials for unrelated databases.

## 3. Restore

Restore is a destructive operation. Take a fresh backup first and stop the web process to avoid writes. This project uses **one application database only** (`society_management`); do not create a second schema for drills or recovery. Dumps produced by the provided scripts contain table data only (no `CREATE DATABASE`/`USE`), so they restore directly into that database.

1. Stop the service: Windows `Stop-Service society-web`; Linux `sudo systemctl stop society-management`.
2. Restore the dump into the single `society_management` database:

   ```bash
   # Linux
   MYSQL_PWD='<db-password>' mysql -h 127.0.0.1 -u society_app society_management < /var/backups/society-management/society_management-20261124T020000Z.sql
   ```

   ```powershell
   # Windows PowerShell (cmd.exe redirection; MYSQL_PWD avoids a visible CLI password)
   $env:MYSQL_PWD = '<db-password>'
   cmd /c "mysql --host=127.0.0.1 --user=society_app society_management < `"E:\backups\society-management\society_management-20261124T020000Z.sql`""
   Remove-Item Env:MYSQL_PWD
   ```

3. Run `npm run prisma:generate` then `npm run prisma:deploy` to confirm committed migrations are applied, and verify file-storage references.
4. Restart the service and run the health checks above plus a smoke test of login, company context, one invoice, and one document download.
5. Record the drill: timestamp, backup file, row counts, result, and operator.

## 4. Audit log review

Sensitive events are recorded in `audit_logs` with actor, action, resource, result, reason, `request_id`, and UTC `created_at` (SRS §16). Audit records are append-only to ordinary users and must not be editable through the admin UI.

```sql
SELECT created_at, actor_user_id, action, resource_type, resource_id, result, reason, request_id
FROM audit_logs
WHERE created_at >= UTC_TIMESTAMP() - INTERVAL 24 HOUR
ORDER BY created_at DESC
LIMIT 200;
```

Prioritize review of login success/failure, password/MFA changes, user deactivation, role/permission changes, module enable/disable, company/society status changes, invoice adjustments, payment recording/refund/reversal, expense approvals, ownership/tenancy changes, data exports, and elevated support access. Escalate unexpected `DENIED`/`FAILED` clusters or entitlement changes without a recorded reason.

## 5. Incident response pointers

Follow the organisation's incident response process (required by SRS §15.4). Typical first actions:

- **Suspected cross-tenant exposure:** keep the affected request IDs and audit rows, block the implicated account/session, preserve the database and logs, and notify the security owner.
- **Session/credential compromise:** revoke sessions (`logout from all devices`), rotate `SESSION_COOKIE_SECRET`/`CSRF_SECRET`, force password resets, and review `login_history`/`security_events`.
- **Database compromise or loss:** isolate MySQL from the network, preserve the disk/image and logs, do not overwrite evidence, and restore from a verified backup into a clean host.
- **Suspicious file upload:** keep the file outside public access, preserve metadata and audit entries, and run malware analysis before deletion.
- **Payment/gateway issue (only after approval):** preserve webhook payloads and signatures, reconcile with `payment_events`, and use idempotency to avoid duplicate effects.

Never place secrets, tokens, full identity data, or stack traces in incident notes that are broadly shared. Review applicable privacy/data-protection law for each target country (SRS §15.4).
