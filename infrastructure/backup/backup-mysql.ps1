<#
.SYNOPSIS
Creates a timestamped logical MySQL backup using credentials from the environment.

.ENVIRONMENT
DATABASE_URL          Required. mysql://user:password@127.0.0.1:3306/society_management
BACKUP_DIR            Optional. Defaults to <repo>/backups.
BACKUP_RETENTION_DAYS Optional. Defaults to 14.

.EXAMPLE
$env:DATABASE_URL = 'mysql://society_app:pwd@127.0.0.1:3306/society_management'
powershell -ExecutionPolicy Bypass -File .\infrastructure\backup\backup-mysql.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Resolve-DatabaseCredential {
    param([Parameter(Mandatory = $true)][string] $Url)

    $uri = [Uri] $Url
    if ($uri.Scheme -notin @('mysql', 'mariadb')) {
        throw 'DATABASE_URL must use the mysql:// scheme.'
    }
    if ([string]::IsNullOrWhiteSpace($uri.UserInfo)) {
        throw 'Connection URL must include user and password.'
    }

    $userInfo = $uri.UserInfo.Split([char] ':', 2)
    $user = [Uri]::UnescapeDataString($userInfo[0])
    $password = if ($userInfo.Length -gt 1) { [Uri]::UnescapeDataString($userInfo[1]) } else { '' }
    $database = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/')).Split('/')[0]
    if ([string]::IsNullOrWhiteSpace($database)) {
        throw 'Connection URL must include a database name.'
    }
    $port = if ($uri.Port -gt 0) { $uri.Port } else { 3306 }

    return [pscustomobject] @{
        User     = $user
        Password = $password
        Host     = $uri.Host
        Port     = $port
        Database = $database
    }
}

$connectionUrl = $env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($connectionUrl)) {
    throw 'Set DATABASE_URL before running the backup.'
}

$credential = Resolve-DatabaseCredential -Url $connectionUrl
if (-not (Get-Command mysqldump -ErrorAction SilentlyContinue)) {
    throw 'mysqldump was not found on PATH. Install the MySQL 8 command-line client.'
}

$backupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $PSScriptRoot '..\..\backups' }
$backupDir = [IO.Path]::GetFullPath($backupDir)
if (-not (Test-Path -LiteralPath $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}

$retentionDays = 14
if ($env:BACKUP_RETENTION_DAYS) {
    if (-not [int]::TryParse($env:BACKUP_RETENTION_DAYS, [ref] $retentionDays)) {
        throw 'BACKUP_RETENTION_DAYS must be an integer.'
    }
}

$safeDatabase = $credential.Database -replace '[^A-Za-z0-9_.-]', '_'
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$target = Join-Path $backupDir "$safeDatabase-$stamp.sql"

$dumpArgs = @(
    "--host=$($credential.Host)",
    "--port=$($credential.Port)",
    "--user=$($credential.User)",
    '--single-transaction',
    '--routines',
    '--triggers',
    '--events',
    '--set-gtid-purged=OFF',
    "--result-file=$target",
    $credential.Database
)

$previousPassword = $env:MYSQL_PWD
try {
    $env:MYSQL_PWD = $credential.Password
    & mysqldump @dumpArgs
    if ($LASTEXITCODE -ne 0) { throw "mysqldump failed with exit code $LASTEXITCODE." }
}
finally {
    if ($null -eq $previousPassword) { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }
    else { $env:MYSQL_PWD = $previousPassword }
}

if (-not (Test-Path -LiteralPath $target) -or (Get-Item -LiteralPath $target).Length -eq 0) {
    throw "Backup file was not created or is empty: $target"
}

$cutoff = [DateTime]::UtcNow.AddDays(-1 * $retentionDays)
Get-ChildItem -LiteralPath $backupDir -Filter "$safeDatabase-*.sql" -File |
    Where-Object { $_.LastWriteTimeUtc -lt $cutoff } |
    Remove-Item -Force

Write-Host "Backup complete: $target"
Write-Host "Retention: files older than $retentionDays days removed from $backupDir"
