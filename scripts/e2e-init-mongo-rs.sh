#!/usr/bin/env bash
# Initiate single-node replica set for local E2E (idempotent).
set -euo pipefail

MONGO_HOST="${MONGO_HOST:-localhost:27017}"
MONGO_URI="${MONGO_URI:-mongodb://${MONGO_HOST}/gogocash-e2e?replicaSet=rs0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if command -v mongosh >/dev/null 2>&1; then
  MONGO_SHELL=(mongosh)
elif command -v docker >/dev/null 2>&1; then
  MONGO_SHELL=(docker compose -f "${ROOT}/docker-compose.e2e.yml" exec -T mongo-e2e mongosh)
else
  echo "[e2e:up] ERROR: mongosh and docker are both unavailable" >&2
  exit 1
fi

echo "[e2e:up] waiting for Mongo at ${MONGO_HOST}..."
for _ in $(seq 1 60); do
  if "${MONGO_SHELL[@]}" --quiet "mongodb://${MONGO_HOST}/admin" --eval "db.runCommand({ ping: 1 }).ok" 2>/dev/null | grep -q 1; then
    break
  fi
  sleep 1
done

echo "[e2e:up] initiating replica set rs0 (if needed)..."
"${MONGO_SHELL[@]}" --quiet "mongodb://${MONGO_HOST}/admin" --eval '
try {
  const s = rs.status();
  if (s.ok === 1) {
    print("replica set already initiated");
  }
} catch (e) {
  rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "'"${MONGO_HOST}"'" }] });
  print("replica set initiated");
}
'

echo "[e2e:up] waiting for PRIMARY..."
for _ in $(seq 1 60); do
  STATE=$("${MONGO_SHELL[@]}" --quiet "mongodb://${MONGO_HOST}/admin" --eval '
try { print(rs.status().members[0].stateStr); } catch(e) { print("UNKNOWN"); }
' 2>/dev/null | tail -1 | tr -d '\r')
  if [ "$STATE" = "PRIMARY" ]; then
    echo "[e2e:up] Mongo PRIMARY ready (${MONGO_URI})"
    exit 0
  fi
  sleep 1
done

echo "[e2e:up] ERROR: Mongo did not reach PRIMARY within timeout" >&2
exit 1
