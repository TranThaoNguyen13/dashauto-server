#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "[CI] Docker not found — skip smoke test."
  exit 0
fi

if [[ ! -S /var/run/docker.sock ]]; then
  echo "[CI] Docker socket not available — skip smoke test."
  exit 0
fi

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-dashauto-ci}"

set -a
# shellcheck source=/dev/null
source "$ROOT/.env.ci"
set +a

# Jenkins chay trong container: port 5433 publish tren HOST, khong phai localhost trong container
if [[ -f /.dockerenv ]] || [[ -n "${JENKINS_URL:-}" ]] || [[ -n "${BUILD_NUMBER:-}" ]]; then
  DB_HOST="${CI_DB_HOST:-172.17.0.1}"
else
  DB_HOST="${CI_DB_HOST:-127.0.0.1}"
fi
export DB_HOST

cleanup() {
  kill "${SERVER_PID:-}" 2>/dev/null || true
  docker compose -f docker-compose.ci.yml down -v --remove-orphans 2>/dev/null || true
}
trap cleanup EXIT

COMPOSE_FILE="docker-compose.ci.yml"

echo "[CI] Starting Postgres for smoke test (port ${DB_PORT})..."
docker compose -f "$COMPOSE_FILE" up -d postgres

echo "[CI] Waiting for Postgres (connect via ${DB_HOST}:${DB_PORT})..."
ready=0
for _ in $(seq 1 45); do
  container_ok=0
  port_ok=0
  if docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    container_ok=1
  fi
  if (echo >/dev/tcp/"$DB_HOST"/"$DB_PORT") >/dev/null 2>&1; then
    port_ok=1
  fi
  if [[ "$container_ok" -eq 1 && "$port_ok" -eq 1 ]]; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "$ready" -ne 1 ]]; then
  echo "[CI] Postgres did not become ready in time (host ${DB_HOST}:${DB_PORT})."
  exit 1
fi

echo "[CI] Running migrations..."
npm run migrate

echo "[CI] Starting API..."
node index.js &
SERVER_PID=$!

for _ in $(seq 1 25); do
  if curl -sf "http://127.0.0.1:${PORT}/" >/dev/null; then
    break
  fi
  sleep 1
done

curl -sf "http://127.0.0.1:${PORT}/" | grep -q "DashAuto"
curl -sf "http://127.0.0.1:${PORT}/api/automation/revenue/comparison" | grep -q "current_orders"
curl -sf "http://127.0.0.1:${PORT}/api/automation/orders/hourly-stats" | grep -q "completed_orders"

echo "[CI] Smoke test passed."
