#!/usr/bin/env bash
set -euo pipefail

# Run from packages/test-infra, after docker compose up -d. HTTP readiness alone
# is not enough: tests also require the authenticated bucket initializer to finish.
timeout 120 bash -c 'until docker compose exec -T rustfs curl -fsS http://127.0.0.1:9000/health >/dev/null; do echo "Waiting for RustFS..."; sleep 2; done'

init_container="$(docker compose ps --all --quiet init-rustfs)"
if [[ -z "$init_container" ]]; then
  echo 'RustFS bucket initializer was not started' >&2
  exit 1
fi
init_status="$(timeout 120 docker wait "$init_container")"
if [[ "$init_status" != 0 ]]; then
  docker compose logs init-rustfs
  echo "RustFS bucket initialization failed with status $init_status" >&2
  exit 1
fi
