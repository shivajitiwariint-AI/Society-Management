# Native development setup

This setup uses **Node 24 + locally installed MySQL 8** and **no Docker, no containers, no SQLite, no PostgreSQL, and no managed cloud database** (SRS §10, §11.3). MySQL listens only on `127.0.0.1` for development.

## 1. Prerequisites

- Node.js 24 (`node -v` must report v24.x; root `package.json` requires `>=24.0.0`). Use the official Node installer, nvm-windows, nvm, fnm, or asdf.
- MySQL Server 8.0 with command-line clients `mysql` and `mysqldump` on `PATH`.
- Git and a modern browser.

## 2. Install MySQL 8 natively

### Windows

1. Run MySQL Installer (community) and install **MySQL Server 8.0** plus **MySQL Command Line Client**. Configure the server as a Windows service (default service name `MySQL80`).
2. In `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini`, set under `[mysqld]`:

   ```ini
   bind-address=127.0.0.1
   ```

3. Restart the service:

   ```powershell
   Restart-Service MySQL80
   Get-Service MySQL80
   ```

4. Sign in as root using the password chosen during installation:

   ```powershell
   mysql -h 127.0.0.1 -u root -p
   ```

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install mysql-server mysql-client
sudo systemctl enable --now mysql
```

Set `bind-address=127.0.0.1` in `/etc/mysql/mysql.conf.d/mysqld.cnf` (path may vary by distribution), then:

```bash
sudo systemctl restart mysql
sudo mysql_secure_installation   # if not already done
sudo mysql -h 127.0.0.1 -u root -p
```

For RHEL/Family distributions use `sudo dnf install mysql-server mysql` and service name `mysqld`.

**Do not install or start a container runtime for this project.** If port 3306 is already used by another service, stop that service or change the port consistently in MySQL and the connection URLs.

## 3. Create one database and one user

Run as a MySQL administrator. Replace the password with a strong, unique value.

```sql
CREATE DATABASE society_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'society_app'@'127.0.0.1' IDENTIFIED BY 'REPLACE_PASSWORD';

-- This single user is used by the app, migrations, seed and backups.
-- Grant privileges on this database only; never grant global privileges.
GRANT ALL PRIVILEGES ON society_management.* TO 'society_app'@'127.0.0.1';
FLUSH PRIVILEGES;
```

`prisma migrate dev` may need a temporary shadow database. To avoid creating another schema, use `npm run prisma:deploy` with the committed migration in production and for routine setup.

Verify:

```sql
SELECT CURRENT_USER(), DATABASE();
SHOW GRANTS FOR 'society_app'@'127.0.0.1';
```

## 4. Configure environment

From the repository root:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

```bash
# Linux
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Edit `.env`:

- `DATABASE_URL` → `mysql://society_app:<app-password>@127.0.0.1:3306/society_management`
- `SESSION_COOKIE_SECRET` and `CSRF_SECRET` → two different generated values
- `PRIVATE_STORAGE_DIR` → a path outside the public web root
- `SEED_SUPERADMIN_*` → strong local bootstrap credentials; rotate after first login
- `NODE_ENV=development`, `APP_URL=http://localhost:3000`, `PORT=3000`

`.env` is ignored by Git. Never commit credentials or use a production password in development.

## 5. Install, generate, migrate, seed, run

```bash
npm install
npm run prisma:generate
npm run prisma:deploy      # applies the committed initial migration; uses DATABASE_URL
# or: npm run prisma:migrate  # development only, creates new migrations
npm run db:seed            # bootstrap Super Admin and reference data
npm run dev
```

To load the illustrative OVH maintenance-expense workbook into an existing playground society:

```bash
npm run db:import:expenses  # idempotent; override with IMPORT_COMPANY_CODE / IMPORT_SOCIETY_NAME
```

Open `http://localhost:3000`. The web app proxies only through npm in development; production uses nginx in front of `127.0.0.1:3000`.

## 6. Verification and common issues

```bash
npm run typecheck
npm run lint
npm test
mysqladmin -h 127.0.0.1 -u society_app -p ping
```

| Symptom | Check |
| --- | --- |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL service running and bound to `127.0.0.1` |
| `Access denied for user` | Username host is `127.0.0.1`, password URL-encoded in `.env`, grants applied |
| `Unknown database` | `CREATE DATABASE society_management` ran with `utf8mb4` |
| Prisma generate/migrate fails | `npm run prisma:generate` first; admin URL correct; shadow-DB permission if needed |
| Port 3000 busy | Change `PORT` and `APP_URL`, or stop the other process |
| Module appears disabled | Check `company_modules` entitlement and the relevant RBAC permission |

For production-style host setup see [`native host installation`](../infrastructure/native%20host%20installation/README.md); for backups see [`infrastructure/backup`](../infrastructure/backup/README.md).
