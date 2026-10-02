<#
==============================================================================
PURVAJ 2.0 - Automated Database Backup Script (PowerShell / Windows)
==============================================================================
#>

param (
    [string]$BackupDir = "D:\purvaj_backups",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "purvaj_backup_$Timestamp.dump"
$LogFile = Join-Path $BackupDir "backup.log"

function Write-Log {
    param([string]$Message)
    $LogEntry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
    Write-Host $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry
}

Write-Log "=========================================================="
Write-Log "Starting PURVAJ 2.0 Database Backup..."
Write-Log "=========================================================="

# Try reading from server/.env if DATABASE_URL is not already in environment
if (-not $env:DATABASE_URL) {
    $envPath = ".\server\.env"
    if (Test-Path $envPath) {
        Get-Content $envPath | ForEach-Object {
            if ($_ -match '^\s*([^#=]+)\s*=\s*(.*)$') {
                $name = $matches[1].Trim()
                $val = $matches[2].Trim().Trim('"').Trim("'")
                if ($name -eq "DATABASE_URL") {
                    $env:DATABASE_URL = $val
                }
            }
        }
    }
}

if (-not $env:DATABASE_URL) {
    Write-Log "ERROR: DATABASE_URL is not set. Aborting backup."
    exit 1
}

Write-Log "Executing pg_dump to $BackupFile..."
try {
    & pg_dump "$($env:DATABASE_URL)" --format=custom --no-owner --no-privileges --verbose --file="$BackupFile" 2>> $LogFile
    if ($LASTEXITCODE -eq 0) {
        $size = (Get-Item $BackupFile).Length / 1MB
        Write-Log ("SUCCESS: Backup completed successfully. Size: {0:N2} MB" -f $size)
    } else {
        Write-Log "ERROR: pg_dump exited with error code $LASTEXITCODE. See $LogFile"
        exit $LASTEXITCODE
    }
} catch {
    Write-Log "ERROR: Exception during pg_dump: $_"
    exit 1
}

# Retention Cleanup
Write-Log "Pruning backups older than $RetentionDays days..."
$CutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "purvaj_backup_*.dump" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | ForEach-Object {
    Write-Log "Deleting old backup: $($_.Name)"
    Remove-Item $_.FullName -Force
}

Write-Log "PURVAJ 2.0 Backup completed successfully."
