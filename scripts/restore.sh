#!/usr/bin/env bash
# ==============================================================================
# PURVAJ 2.0 - Database Restore Script (PostgreSQL / Supabase)
# ==============================================================================
# WARNING: This script restores a custom format dump file into PostgreSQL.
# Existing schema/tables might be overwritten based on pg_restore flags.
# ==============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <path_to_backup_file.dump> [target_database_url]"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file ${BACKUP_FILE} does not exist!"
    exit 1
fi

TARGET_URL="${2:-${DATABASE_URL:-}}"

if [ -z "${TARGET_URL}" ]; then
    if [ -f "./server/.env" ]; then
        export $(grep -v '^#' ./server/.env | xargs)
        TARGET_URL="${DATABASE_URL:-}"
    fi
fi

if [ -z "${TARGET_URL}" ]; then
    echo "ERROR: Target DATABASE_URL is not set!"
    exit 1
fi

echo "=========================================================="
echo "PURVAJ 2.0 DATABASE RESTORE UTILITY"
echo "=========================================================="
echo "Backup File: ${BACKUP_FILE}"
echo "Target DB:   [Configured via URL]"
echo "=========================================================="
read -p "Are you sure you want to proceed with database restoration? (type 'RESTORE' to confirm): " CONFIRM

if [ "${CONFIRM}" != "RESTORE" ]; then
    echo "Restoration aborted by operator."
    exit 0
fi

echo "Starting pg_restore..."
pg_restore \
    --dbname="${TARGET_URL}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --verbose \
    "${BACKUP_FILE}"

echo "=========================================================="
echo "Database restoration completed successfully."
echo "=========================================================="
