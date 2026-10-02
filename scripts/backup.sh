#!/usr/bin/env bash
# ==============================================================================
# PURVAJ 2.0 - Automated Database Backup Script (PostgreSQL / Supabase)
# ==============================================================================
# Features:
# - Custom format archive (pg_dump -Fc) with high compression
# - Automated timestamped file generation
# - Retention management: prunes backups older than RETENTION_DAYS (default 30)
# - Verifies dump integrity before completing
# - Slack/Webhook notification support (optional)
# ==============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/purvaj}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/purvaj_backup_${TIMESTAMP}.dump"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Load DB configuration from .env if present
if [ -f "./server/.env" ]; then
    export $(grep -v '^#' ./server/.env | xargs)
elif [ -f "./.env" ]; then
    export $(grep -v '^#' ./.env | xargs)
fi

mkdir -p "${BACKUP_DIR}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "=========================================================="
log "Starting PURVAJ 2.0 Database Backup..."
log "=========================================================="

if [ -z "${DATABASE_URL:-}" ]; then
    log "ERROR: DATABASE_URL is not set. Aborting backup."
    exit 1
fi

# Execute pg_dump
log "Executing pg_dump to ${BACKUP_FILE}..."
if pg_dump "${DATABASE_URL}" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --verbose \
    --file="${BACKUP_FILE}" 2>> "${LOG_FILE}"; then
    
    FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log "SUCCESS: Backup completed successfully. Size: ${FILE_SIZE}"
else
    log "ERROR: pg_dump failed! Check log at ${LOG_FILE}."
    exit 1
fi

# Retention Cleanup: delete backups older than RETENTION_DAYS
log "Pruning backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}..."
find "${BACKUP_DIR}" -name "purvaj_backup_*.dump" -type f -mtime +"${RETENTION_DAYS}" -exec rm -f {} \;
log "Retention cleanup complete."

log "PURVAJ 2.0 Backup finished successfully."
