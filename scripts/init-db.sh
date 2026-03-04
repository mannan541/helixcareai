#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting PostgreSQL (pgvector)..."
cd "$ROOT_DIR" && docker compose up -d postgres

echo "Waiting for PostgreSQL to be ready..."
until docker compose exec -T postgres pg_isready -U postgres -d helixcareai 2>/dev/null; do
  sleep 2
done

echo "Running schema..."
docker compose exec -T postgres psql -U postgres -d helixcareai -f /docker-entrypoint-initdb.d/01-schema.sql 2>/dev/null || \
  PGPASSWORD=postgres psql -h localhost -U postgres -d helixcareai -f "$ROOT_DIR/database/schema.sql"

echo "Database ready."
