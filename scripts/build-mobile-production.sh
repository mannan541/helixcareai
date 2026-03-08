#!/usr/bin/env bash
# Build Flutter web for PRODUCTION only. Uses mobile/.env.production so the
# built app points at the production API (never localhost).
# Run from repo root: ./scripts/build-mobile-production.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE="$REPO_ROOT/mobile"
ENV_PROD="$MOBILE/.env.production"
ENV="$MOBILE/.env"

if [ ! -f "$ENV_PROD" ]; then
  echo "Error: $ENV_PROD is required for production build. Create it with API_BASE_URL=<your-production-api-url>" >&2
  exit 1
fi

echo "Using production env from .env.production"
cp "$ENV_PROD" "$ENV"
grep -v '^#' "$ENV" | grep -v '^$' || true

cd "$MOBILE"
flutter build web --release

echo "Done. Built app uses API_BASE_URL from .env.production (production only)."
