#!/bin/sh
set -e

echo "=== PureGrain API ==="

# Train synthetic model if artifact is missing
if [ ! -f app/data/model.joblib ]; then
    echo "[1/4] Training synthetic Random Forest model..."
    python -m app.ml.train
else
    echo "[1/4] Synthetic model found, skipping."
fi

# Train weather model if artifact is missing
if [ ! -f app/data/model_weather.joblib ]; then
    echo "[2/4] Training weather-based Random Forest model..."
    python -m app.ml.train_weather
else
    echo "[2/4] Weather model found, skipping."
fi

# Run Alembic migrations
echo "[3/4] Applying database migrations..."
alembic upgrade head

# Start API
echo "[4/4] Starting API on :8000"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
