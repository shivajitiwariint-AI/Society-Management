# MySQL backup and restore

Two native scripts create timestamped logical backups of the local MySQL 8 database:

- `backup-mysql.ps1` — Windows PowerShell
- `backup-mysql.sh` — Linux bash

Both read credentials from `DATABASE_URL`, never from source control. This is the same single connection used by the app, migrations and seed. They use `mysqldump --single-transaction --routines --triggers --events` and remove old `*.sql` backups after `BACKUP_RETENTION_DAYS`. Backups contain table data only, so they can be restored into a separate test schema.

## Environment

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | — | `mysql://user:password@127.0.0.1:3306/society_management` |
| `BACKUP_DIR` | no | `<repo>/backups` | Destination directory |
| `BACKUP_RETENTION_DAYS` | no | `14` | Delete timestamped dumps older than this |

URL-encode special characters in the password (for example `@` → `%40`). The scripts decode credentials and pass the password through `MYSQL_PWD`, cleared after use. Protect the backup directory with OS permissions (`umask 077` on Linux; restrict ACLs on Windows).

## Run manually

Windows PowerShell:

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

Output example: `society_management-20261124T020000Z.sql` (UTC filename).

## Scheduling

### Windows Task Scheduler

Create a task that runs at the approved interval with this action:

- Program: `powershell.exe`
- Arguments: `-NoProfile -ExecutionPolicy Bypass -File "E:\Demo Website\Society Management\infrastructure\backup\backup-mysql.ps1"`
- Start in: `E:\Demo Website\Society Management`
- Set the task's environment variables from a secured user/service account or a protected wrapper script. Do not store passwords in the task arguments.
- Configure "Run whether user is logged on or not", a service account with access to the backup directory, and failure alerts.

### Linux cron / systemd timer

Example `/etc/cron.d/society-backup` (adjust paths and load secrets from a `0600` env file):

```cron
0 2 * * * society . /etc/society-management/backup.env; /bin/bash /opt/society-management/infrastructure/backup/backup-mysql.sh
```

A systemd timer with `EnvironmentFile=/etc/society-management/backup.env` is preferred where available. Alert on non-zero exit status, stale backup files, and low disk space.

## Test restore (mandatory drill)

Run a restore drill on a schedule agreed with the product owner; SRS §24.9 leaves RPO/RTO/retention targets pending. Never test only that the dump file exists. This project uses **one application database only** (`society_management`); do not create a second schema for drills.

1. Take a fresh backup and stop the web service so no writes occur during the drill.
2. Restore from a recent dump into the same database:

   ```bash
   MYSQL_PWD='<db-password>' mysql -h 127.0.0.1 -u society_app society_management < /var/backups/society-management/society_management-20261124T020000Z.sql
   ```

   Windows:

   ```powershell
   $env:MYSQL_PWD = '<db-password>'
   cmd /c "mysql --host=127.0.0.1 --user=society_app society_management < `"E:\backups\society-management\society_management-20261124T020000Z.sql`""
   Remove-Item Env:MYSQL_PWD
   ```

3. Run `npm run prisma:deploy`, verify table counts, check a known invoice/journal pair, and confirm the file-storage references still resolve.
4. Restart the service and record the drill result (date, dump, operator, duration, issues).

Production recovery steps and audit/incident pointers are in [`docs/runbook.md`](../../docs/runbook.md). Back up private document storage on the same schedule as the database, since database rows reference files outside the web root (SRS §18).
