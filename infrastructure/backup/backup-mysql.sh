#!/usr/bin/env bash
# Timestamped logical MySQL backup with credentials from the environment.
#
#   DATABASE_URL        Required. mysql://user:password@127.0.0.1:3306/society_management
#   BACKUP_DIR          Optional. Defaults to <repo>/backups.
#   BACKUP_RETENTION_DAYS Optional. Defaults to 14.
#
# Usage:
#   export DATABASE_URL='mysql://society_app:pwd@127.0.0.1:3306/society_management'
#   bash infrastructure/backup/backup-mysql.sh

set -euo pipefail
umask 077

urldecode() {
    local encoded="${1//+/ }"
    printf '%b' "${encoded//%/\\x}"
}

url="${DATABASE_URL:-}"
if [[ -z "$url" ]]; then
    echo "Set DATABASE_URL before running the backup." >&2
    exit 1
fi
if [[ "$url" != mysql://* && "$url" != mariadb://* ]]; then
    echo "Connection URL must use the mysql:// scheme." >&2
    exit 1
fi

rest="${url#*://}"
auth="${rest%%@*}"
if [[ "$auth" == "$rest" ]]; then
    echo "Connection URL must include user and password." >&2
    exit 1
fi
if [[ "$auth" != *:* ]]; then
    echo "Connection URL must include a password." >&2
    exit 1
fi

hostpart="${rest#*@}"
if [[ "$hostpart" != */* ]]; then
    echo "Connection URL must include a database name." >&2
    exit 1
fi

user="$(urldecode "${auth%%:*}")"
password="$(urldecode "${auth#*:}")"
authority="${hostpart%%/*}"
dbpath="${hostpart#*/}"
database="$(urldecode "${dbpath%%\?*}")"
host="${authority%%:*}"
port=3306
if [[ "$authority" == *:* ]]; then
    port="${authority##*:}"
fi

if ! command -v mysqldump >/dev/null 2>&1; then
    echo "mysqldump was not found on PATH. Install the MySQL 8 client." >&2
    exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
backup_dir="${BACKUP_DIR:-${script_dir}/../../backups}"
mkdir -p "$backup_dir"

retention="${BACKUP_RETENTION_DAYS:-14}"
if [[ ! "$retention" =~ ^[0-9]+$ ]]; then
    echo "BACKUP_RETENTION_DAYS must be an integer." >&2
    exit 1
fi

safe_database="${database//[^A-Za-z0-9_.-]/_}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="${backup_dir}/${safe_database}-${stamp}.sql"

cleanup() { unset MYSQL_PWD; }
trap cleanup EXIT
export MYSQL_PWD="$password"

mysqldump \
    --host="$host" \
    --port="$port" \
    --user="$user" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --set-gtid-purged=OFF \
    "$database" > "$target"

if [[ ! -s "$target" ]]; then
    echo "Backup file was not created or is empty: $target" >&2
    exit 1
fi

find "$backup_dir" -maxdepth 1 -type f -name "${safe_database}-*.sql" -mtime "+${retention}" -delete

echo "Backup complete: $target"
echo "Retention: files older than ${retention} days removed from $backup_dir"
