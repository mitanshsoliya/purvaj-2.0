<#
==============================================================================
PURVAJ 2.0 - Database Restore Script (PowerShell / Windows)
==============================================================================
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,

    [string]$TargetDatabaseUrl = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file $BackupFile does not exist!"
    exit 1
}

if (-not $TargetDatabaseUrl) {
    if ($env:DATABASE_URL) {
        $TargetDatabaseUrl = $env:DATABASE_URL
    } else {
        $envPath = ".\server\.env"
        if (Test-Path $envPath) {
            Get-Content $envPath | ForEach-Object {
                if ($_ -match '^\s*([^#=]+)\s*=\s*(.*)$') {
                    $name = $matches[1].Trim()
                    $val = $matches[2].Trim().Trim('"').Trim("'")
                    if ($name -eq "DATABASE_URL") {
                        $TargetDatabaseUrl = $val
                    }
                }
            }
        }
    }
}

if (-not $TargetDatabaseUrl) {
    Write-Error "Target DATABASE_URL is not provided or configured in .env!"
    exit 1
}

Write-Host "=========================================================="
Write-Host "PURVAJ 2.0 DATABASE RESTORE UTILITY"
Write-Host "=========================================================="
Write-Host "Backup File: $BackupFile"
Write-Host "=========================================================="
$confirm = Read-Host "Are you sure you want to restore the database? (type 'RESTORE' to confirm)"

if ($confirm -ne "RESTORE") {
    Write-Host "Restoration cancelled by operator."
    exit 0
}

Write-Host "Executing pg_restore..."
& pg_restore --dbname="$TargetDatabaseUrl" --clean --if-exists --no-owner --no-privileges --verbose "$BackupFile"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database restoration completed successfully."
} else {
    Write-Warning "pg_restore finished with status code $LASTEXITCODE. Verify tables."
}
