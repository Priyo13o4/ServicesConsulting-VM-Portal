#!/bin/sh
# Nightly database backup on a dev/prod server. Run from the repo root, e.g. cron:
#   0 2 * * * cd /opt/vm-portal && ./scripts/backup.sh >> backups/backup.log 2>&1
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP=$(date +%Y-%m-%d_%H%M)
FILE="$BACKUP_DIR/vm_portal_$STAMP.dump"

mkdir -p "$BACKUP_DIR"
docker compose --env-file .env.deploy -f compose.yml -f compose.release.yml -f compose.deploy.yml \
  exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$FILE"
find "$BACKUP_DIR" -name 'vm_portal_*.dump' -mtime +"$KEEP_DAYS" -delete
echo "Backup written: $FILE"
