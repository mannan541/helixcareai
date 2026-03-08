#!/usr/bin/env bash
# Build Flutter web with PRODUCTION env only, then deploy to Vercel.
# Run from repo root: ./scripts/deploy-mobile-vercel.sh
# Requires: mobile/.env.production with API_BASE_URL=<production-backend-url>

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

"$SCRIPT_DIR/build-mobile-production.sh"
echo "Deploying to Vercel..."
cd "$REPO_ROOT"
vercel --prod
