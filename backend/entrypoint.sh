#!/bin/sh
set -e

echo "=== PureGrain API ==="

# Run Alembic migrations
echo "[1/2] Applying database migrations..."
alembic upgrade head

# Start API
echo "[2/2] Starting API on :8000"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
