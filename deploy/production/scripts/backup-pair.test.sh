#!/usr/bin/env bash
set -Eeuo pipefail
export PATH="/usr/bin:/bin:$PATH"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
backup_script="$script_dir/backup-pair.sh"
release_sha="0123456789abcdef0123456789abcdef01234567"
image_digest="sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
passed=0
fixture=''

cleanup_on_exit() {
  if [[ -n "${fixture:-}" && -d "$fixture" ]]; then
    rm -rf -- "$fixture"
  fi
}

trap cleanup_on_exit EXIT

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

new_fixture() {
  fixture="$(mktemp -d)"
  mkdir -p "$fixture/bin" "$fixture/uploads" "$fixture/backups"
  printf 'release fixture\n' >"$fixture/release.env"
  printf 'image\n' >"$fixture/uploads/example.jpg"

  cat >"$fixture/bin/docker" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail
printf '%s\n' "$*" >>"$FAKE_DOCKER_LOG"
if [[ "$*" == *"ps --services --filter status=running"* ]]; then
  printf '%s\n' "${FAKE_RUNNING_SERVICES:-api db}"
elif [[ "$*" == *"_prisma_migrations"* ]]; then
  printf '%s\n' '20250101000000_init' '20250202000000_add_posts'
elif [[ "$*" == *"pg_dump"* ]]; then
  printf 'fake-custom-dump\n'
fi
EOF
  chmod +x "$fixture/bin/docker"

  cat >"$fixture/bin/pg_restore" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
  chmod +x "$fixture/bin/pg_restore"

  cat >"$fixture/bin/date" <<'EOF'
#!/usr/bin/env bash
printf '20260719T000000Z\n'
EOF
  chmod +x "$fixture/bin/date"

  export FAKE_DOCKER_LOG="$fixture/docker.log"
  : >"$FAKE_DOCKER_LOG"
}

cleanup_fixture() {
  rm -rf -- "$fixture"
  fixture=''
}

run_backup() {
  local backup_root="$1"
  local running_services="${2:-api db}"
  PATH="$fixture/bin:$PATH" \
  RELEASE_ENV_FILE="$fixture/release.env" \
  BACKUP_ROOT="$backup_root" \
  UPLOADS_DIR="$fixture/uploads" \
  RELEASE_SHA="$release_sha" \
  API_IMAGE_DIGEST="$image_digest" \
  FAKE_RUNNING_SERVICES="$running_services" \
    "$backup_script"
}

test_rejects_backup_inside_uploads() {
  new_fixture
  local output status
  set +e
  output="$(run_backup "$fixture/uploads/backups" 2>&1)"
  status=$?
  set -e
  [[ $status -eq 2 ]] || fail "backup inside uploads exited $status: $output"
  [[ "$output" == *"BACKUP_ROOT must not be inside UPLOADS_DIR"* ]] || fail 'missing uploads nesting error'
  [[ ! -s "$FAKE_DOCKER_LOG" ]] || fail 'docker was called before uploads nesting rejection'
  cleanup_fixture
  ((passed += 1))
}

test_rejects_existing_timestamp_directory() {
  new_fixture
  mkdir -p "$fixture/backups/20260719T000000Z-$release_sha.incomplete"
  local output status
  set +e
  output="$(run_backup "$fixture/backups" 2>&1)"
  status=$?
  set -e
  [[ $status -eq 2 ]] || fail "collision exited $status: $output"
  [[ "$output" == *"Backup destination already exists"* ]] || fail 'missing collision error'
  if grep -Evq ' ps --services --filter status=running$' "$FAKE_DOCKER_LOG"; then
    fail 'write-capable docker command ran before collision rejection'
  fi
  cleanup_fixture
  ((passed += 1))
}

test_rejects_running_write_tool() {
  new_fixture
  local output status
  set +e
  output="$(run_backup "$fixture/backups" $'api\ndb\nseed-demo' 2>&1)"
  status=$?
  set -e
  [[ $status -eq 2 ]] || fail "running tool exited $status: $output"
  [[ "$output" == *"Write-capable tool is running: seed-demo"* ]] || fail 'missing running tool error'
  [[ ! -d "$fixture/backups/20260719T000000Z-$release_sha.incomplete" ]] || fail 'backup directory created before tool check'
  cleanup_fixture
  ((passed += 1))
}

test_manifest_contains_restore_identity() {
  new_fixture
  run_backup "$fixture/backups" >/dev/null
  local complete="$fixture/backups/20260719T000000Z-$release_sha"
  local manifest="$complete/manifest.json"
  [[ -f "$manifest" ]] || fail 'manifest was not created'
  local manifest_for_node="$manifest"
  if command -v cygpath >/dev/null 2>&1; then
    manifest_for_node="$(cygpath -w "$manifest")"
  fi
  MSYS2_ARG_CONV_EXCL='*' node -e 'const fs=require("node:fs");const [manifestPath,complete,imageDigest]=process.argv.slice(1);const value=JSON.parse(fs.readFileSync(manifestPath,"utf8"));if(value.apiImageDigest!==imageDigest||value.backupRoot!==complete||!Array.isArray(value.migrations)||value.migrations.length!==2)process.exit(1);for(const key of ["database","uploads"]){if(!value[key]?.path?.startsWith(`${complete}/`)||!Number.isSafeInteger(value[key]?.sizeBytes)||value[key].sizeBytes<=0||!/^[0-9a-f]{64}$/.test(value[key]?.sha256))process.exit(1)}' \
    "$manifest_for_node" "$complete" "$image_digest"
  cleanup_fixture
  ((passed += 1))
}

test_rejects_backup_inside_uploads
test_rejects_existing_timestamp_directory
test_rejects_running_write_tool
test_manifest_contains_restore_identity

printf 'backup-pair tests passed: %d\n' "$passed"
