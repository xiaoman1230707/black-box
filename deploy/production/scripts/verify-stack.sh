#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:-base}"
COMPOSE_FILE="${COMPOSE_FILE:-deploy/production/compose.yaml}"
RELEASE_ENV_FILE="${RELEASE_ENV_FILE:-}"

if [[ "$MODE" != "base" && "$MODE" != "authenticated-sse" ]]; then
  printf 'Usage: %s [base|authenticated-sse]\n' "$0" >&2
  exit 2
fi
if [[ -z "$RELEASE_ENV_FILE" || ! -f "$RELEASE_ENV_FILE" ]]; then
  printf 'RELEASE_ENV_FILE must name an existing file\n' >&2
  exit 2
fi

compose=(docker compose --env-file "$RELEASE_ENV_FILE" -f "$COMPOSE_FILE")

printf 'Checking PostgreSQL readiness...\n'
"${compose[@]}" exec -T db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null

printf 'Checking Nest liveness...\n'
"${compose[@]}" exec -T api node -e \
  "fetch('http://127.0.0.1:3000/api',{signal:AbortSignal.timeout(5000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

printf 'Checking Prisma-backed readiness...\n'
"${compose[@]}" exec -T api node -e \
  "fetch('http://127.0.0.1:3000/api/posts?page=1&limit=1',{signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)process.exit(1);return r.json()}).then(v=>{if(!v||!Array.isArray(v.items)||typeof v.total!=='number')process.exit(1)}).catch(()=>process.exit(1))"

printf 'Checking uploads mount permissions...\n'
"${compose[@]}" exec -T api node -e \
  "require('node:fs').accessSync('/app/uploads',require('node:fs').constants.R_OK|require('node:fs').constants.W_OK)"

if [[ "$MODE" == "authenticated-sse" ]]; then
  if [[ -z "${PREFLIGHT_JWT:-}" ]]; then
    printf 'PREFLIGHT_JWT is required for authenticated-sse mode\n' >&2
    exit 2
  fi
  printf 'Checking authenticated Chat data stream...\n'
  "${compose[@]}" exec -T -e PREFLIGHT_JWT="$PREFLIGHT_JWT" api node -e \
    "fetch('http://127.0.0.1:3000/api/ai/chat',{method:'POST',headers:{Authorization:'Bearer '+process.env.PREFLIGHT_JWT,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'Reply briefly.'}]}),signal:AbortSignal.timeout(60000)}).then(async r=>{if(!r.ok||r.headers.get('x-vercel-ai-data-stream')!=='v1')process.exit(1);const t=await r.text();if(!t.includes('0:')||!t.includes('d:'))process.exit(1)}).catch(()=>process.exit(1))"
fi

printf 'Stack verification passed (%s).\n' "$MODE"
