#!/bin/sh
set -e

echo "=== PureGrain API ==="

# Train model if artifact is missing
if [ ! -f app/data/model.joblib ]; then
    echo "[1/3] Training Random Forest model on synthetic data..."
    python -m app.ml.train
else
    echo "[1/3] Model artifact found, skipping training."
fi

# Run Alembic migrations
echo "[2/3] Applying database migrations..."
alembic upgrade head

# Start API
echo "[3/3] Starting API on :8000"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
