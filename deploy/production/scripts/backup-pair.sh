#!/usr/bin/env bash
set -Eeuo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-deploy/production/compose.yaml}"
RELEASE_ENV_FILE="${RELEASE_ENV_FILE:-}"
BACKUP_ROOT="${BACKUP_ROOT:-}"
UPLOADS_DIR="${UPLOADS_DIR:-}"
RELEASE_SHA="${RELEASE_SHA:-}"
API_IMAGE_DIGEST="${API_IMAGE_DIGEST:-}"

for path_name in RELEASE_ENV_FILE BACKUP_ROOT UPLOADS_DIR; do
  value="${!path_name:-}"
  if [[ -z "$value" || "$value" != /* ]]; then
    printf '%s must be an absolute path\n' "$path_name" >&2
    exit 2
  fi
done
if [[ ! "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  printf 'RELEASE_SHA must be a full lowercase Git SHA\n' >&2
  exit 2
fi
if [[ ! "$API_IMAGE_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  printf 'API_IMAGE_DIGEST must be a sha256 image digest\n' >&2
  exit 2
fi
if [[ ! -f "$RELEASE_ENV_FILE" || ! -d "$UPLOADS_DIR" ]]; then
  printf 'Release env or uploads directory does not exist\n' >&2
  exit 2
fi

BACKUP_ROOT="$(realpath -m "$BACKUP_ROOT")"
UPLOADS_DIR="$(realpath "$UPLOADS_DIR")"

existing_ancestor="$BACKUP_ROOT"
while [[ ! -d "$existing_ancestor" ]]; do
  parent="$(dirname "$existing_ancestor")"
  if [[ "$parent" == "$existing_ancestor" ]]; then
    printf 'Unable to resolve an existing BACKUP_ROOT ancestor\n' >&2
    exit 2
  fi
  existing_ancestor="$parent"
done

inside_git_worktree=false
if command -v git >/dev/null 2>&1; then
  if git_state="$(git -C "$existing_ancestor" rev-parse --is-inside-work-tree 2>/dev/null)"; then
    [[ "$git_state" == true ]] && inside_git_worktree=true
  fi
fi

if [[ "$inside_git_worktree" == true ]]; then
  printf 'BACKUP_ROOT must be outside the repository\n' >&2
  exit 2
fi

if [[ "$inside_git_worktree" == false ]]; then
  marker_ancestor="$existing_ancestor"
  while true; do
    if [[ -d "$marker_ancestor/.git" || -f "$marker_ancestor/.git" ]]; then
      printf 'BACKUP_ROOT must be outside the repository\n' >&2
      exit 2
    fi
    [[ "$marker_ancestor" == / ]] && break
    marker_ancestor="$(dirname "$marker_ancestor")"
  done
fi

case "$BACKUP_ROOT" in
  "$UPLOADS_DIR"|"$UPLOADS_DIR"/*)
    printf 'BACKUP_ROOT must not be inside UPLOADS_DIR\n' >&2
    exit 2
    ;;
esac

mkdir -p "$BACKUP_ROOT"

compose=(docker compose --env-file "$RELEASE_ENV_FILE" -f "$COMPOSE_FILE")
write_tools=(migrate seed-games rebuild-tags seed-demo embedding-backfill)
running_services="$("${compose[@]}" ps --services --filter status=running)"
for service in "${write_tools[@]}"; do
  if grep -Fxq "$service" <<<"$running_services"; then
    printf 'Write-capable tool is running: %s\n' "$service" >&2
    exit 2
  fi
done

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
if [[ ! "$timestamp" =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
  printf 'Unable to create a valid UTC backup timestamp\n' >&2
  exit 2
fi
created_at_utc="${timestamp:0:4}-${timestamp:4:2}-${timestamp:6:2}T${timestamp:9:2}:${timestamp:11:2}:${timestamp:13:2}Z"
incomplete="$BACKUP_ROOT/$timestamp-$RELEASE_SHA.incomplete"
complete="$BACKUP_ROOT/$timestamp-$RELEASE_SHA"
if [[ -e "$incomplete" || -e "$complete" ]]; then
  printf 'Backup destination already exists\n' >&2
  exit 2
fi
mkdir "$incomplete"

json_escape() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  value="${value//$'\t'/\\t}"
  printf '%s' "$value"
}

failed=true
api_stopped=false
on_exit() {
  if [[ "$failed" == true ]]; then
    if [[ "$api_stopped" == true ]]; then
      printf 'Backup failed; API remains stopped and incomplete artifacts are retained at %s\n' "$incomplete" >&2
    else
      printf 'Backup failed before API stop was confirmed; verify service state. Incomplete artifacts remain at %s\n' "$incomplete" >&2
    fi
  fi
}
trap on_exit EXIT

printf 'Stopping API to create a matched backup pair...\n'
"${compose[@]}" stop api >/dev/null
api_stopped=true

"${compose[@]}" exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  >"$incomplete/database.dump"
tar -C "$UPLOADS_DIR" -czf "$incomplete/uploads.tar.gz" .

pg_restore --list "$incomplete/database.dump" >/dev/null
tar -tzf "$incomplete/uploads.tar.gz" >/dev/null

mapfile -t migrations < <(
  "${compose[@]}" exec -T db sh -c \
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "SELECT migration_name FROM \"_prisma_migrations\" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at, migration_name"'
)
if [[ ${#migrations[@]} -eq 0 ]]; then
  printf 'No applied Prisma migrations were found\n' >&2
  exit 1
fi
migration_json=''
for migration in "${migrations[@]}"; do
  if [[ ! "$migration" =~ ^[A-Za-z0-9_-]+$ ]]; then
    printf 'Applied migration name contains unsupported characters\n' >&2
    exit 1
  fi
  [[ -n "$migration_json" ]] && migration_json+=','
  migration_json+="\"$(json_escape "$migration")\""
done

db_sha="$(sha256sum "$incomplete/database.dump" | awk '{print $1}')"
uploads_sha="$(sha256sum "$incomplete/uploads.tar.gz" | awk '{print $1}')"
db_size="$(stat -c '%s' "$incomplete/database.dump")"
uploads_size="$(stat -c '%s' "$incomplete/uploads.tar.gz")"
database_path="$complete/database.dump"
uploads_path="$complete/uploads.tar.gz"
printf '%s  database.dump\n%s  uploads.tar.gz\n' "$db_sha" "$uploads_sha" \
  >"$incomplete/SHA256SUMS"
printf '{\n  "releaseSha": "%s",\n  "apiImageDigest": "%s",\n  "createdAtUtc": "%s",\n  "backupRoot": "%s",\n  "migrations": [%s],\n  "database": {"path": "%s", "sizeBytes": %s, "sha256": "%s"},\n  "uploads": {"path": "%s", "sizeBytes": %s, "sha256": "%s"}\n}\n' \
  "$RELEASE_SHA" "$API_IMAGE_DIGEST" "$created_at_utc" "$(json_escape "$complete")" \
  "$migration_json" "$(json_escape "$database_path")" "$db_size" "$db_sha" \
  "$(json_escape "$uploads_path")" "$uploads_size" "$uploads_sha" \
  >"$incomplete/manifest.json"

mv "$incomplete" "$complete"
failed=false
printf 'Matched backup pair created: %s\n' "$complete"
printf 'API remains stopped pending explicit verification and restart authorization.\n'
