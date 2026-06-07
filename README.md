# PureGrain

Predictive detection of fungal contamination (mycotoxins) in cereal crops.  
Built for the **D4Gen 2026 Hackathon**.

A portable biosensor measures Zearalenone (ZEN) levels in the field. PureGrain correlates that reading with historical weather data to predict contamination risk before harvest and during silo storage.

---
# PureGrain

Predictive service for fungal contamination (mycotoxins) in cereal crops.

This repository contains a FastAPI backend and a Next.js frontend used to:
- import field/sampling CSVs,
- fetch or assemble weather/context features,
- run model inference (per-toxin probabilities and per-strain risks),
- display results on a map UI and per-strain risk lists.

The project was developed during the D4Gen 2026 effort and is intended as
an experimental prototype: models are stored as serialized artifacts on disk
and a lightweight registry is available to keep track of weights/metadata.

**Repository layout (important paths)**

- `backend/` — FastAPI application
      - `app/api/routes/` — API route modules (`predict.py`, `imports.py`, `models.py`, `map.py`, ...)
      - `app/services/` — ML pipelines and helpers (`lgbm_pipeline.py`, `prediction_service.py`, `contamination.py`, `csv_import.py`)
      - `app/ml/weights/` — convention: place joblib/pkl model files here for the generic discovery service
      - `app/data/` — example datasets and some model artifacts (e.g. `toxin_detection_classifier.txt` for the LightGBM pipeline)
      - `app/db/` — SQLAlchemy models and Alembic migrations

- `frontend/` — Next.js (app router) React UI
      - `src/app/` — pages and API helpers
      - `src/components/sections/PredictionMap.tsx` — map UI and per-strain risk integration

---

**Key concepts**

- Two inference paths exist in the backend:
      1. `lgbm_pipeline.py` — a LightGBM pipeline that expects ~61 days of historical weather to build lag/stat features and outputs per-toxin probabilities (ZEN, DON, AFLA).
      2. `prediction_service.py` — a disk-based model discovery runner that looks for joblib/pkl artifacts under `app/ml/weights/` and runs `.predict` / `.predict_proba` on provided DataFrames. Models used with this service should embed their preprocessing or accept the simplified input schema (date, lat, lon).

- A small `ModelRegistry` SQLAlchemy model and Alembic migration exist to track `strain`, `weight_path`, `accuracy`, `notes`.

---

**Quickstart — development (Docker compose)**

Prerequisites: Docker & docker-compose or Make + GNU Make.

From the repository root:

```bash
# build and start services (Postgres, backend, frontend depending on compose)
docker-compose up --build

# or with the provided Makefile
make up
```

The backend runs by default on `http://localhost:8000` and exposes OpenAPI at `/docs`.

**Run backend alone (venv)**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# set DATABASE_URL and other env vars expected by app/core/config.py
uvicorn app.main:app --reload --port 8000
```

---

**Useful API endpoints**

- POST `/api/v1/imports/csv` — upload a CSV file to import sampling records (see `app/services/csv_import.py`).
- POST `/api/v1/predict/full` — unified prediction endpoint that uses the LightGBM pipeline and returns: contamination probabilities, per-toxin probabilities, accuracy estimate, risk level, weather summary, and generated file paths (response model in `app/api/routes/predict.py`).
- POST `/api/v1/predict/risks/geo` — per-strain risks from a minimal input `{lat, lon, date}` (disk-discovery models or registry-backed models depending on setup).
- POST `/api/v1/models/register` — register a model in the database (strain name, `weight_path`, optional accuracy/notes).
- GET `/api/v1/models/` — list registered models.

Examples:

```bash
curl -X POST "http://localhost:8000/api/v1/predict/risks/geo" \
      -H "Content-Type: application/json" \
      -d '{"lat":49.29,"lon":2.25,"date":"2026-06-06","crop_group":"wheat"}'

curl -X POST "http://localhost:8000/api/v1/models/register" \
      -H "Content-Type: application/json" \
      -d '{"strain":"soucheA","weight_path":"app/ml/weights/soucheA.joblib","accuracy":0.92}'
```

Notes:
- If you added a LightGBM `.txt` booster (example: `app/data/toxin_detection_classifier.txt`), call the `lgbm_pipeline` endpoints (`/predict/full`) so the pipeline builds required lag features. The generic disk discovery service will not automatically use that `.txt` Booster unless adapted.

---

**Where to put model files**

- For the generic discovery service: `backend/app/ml/weights/` (joblib/pkl files). Each model should either include preprocessing or match the input columns supplied by the caller.
- For the LightGBM pipeline: the current artifact is at `backend/app/data/toxin_detection_classifier.txt` and is used by `lgbm_pipeline.py` which expects historical weather to compute features.

---

**Frontend**

Start the Next.js app (from `frontend/`):

```bash
cd frontend
npm install
npm run dev
```

The UI provides a `PredictionMap` component that requests `/predict/geo` and `/predict/risks/geo` to show per-location contamination probabilities and per-strain risk bars.

---

**Development notes & troubleshooting**

- If frontend shows zeros for toxin probabilities, check which endpoint the UI calls:
      - `/api/v1/predict/full` → uses the `lgbm_pipeline` and will produce non-zero results if the LightGBM artifact and required weather features are available.
      - `/api/v1/predict/risks/geo` → uses the disk-based predictor; ensure models are present under `app/ml/weights/` and that they accept the provided minimal features.

- CORS: the backend enables CORS for configured origins in `app/core/config.py`.

---

**Contributing**

- Add new model artifacts into `backend/app/ml/weights/` and register them via `/api/v1/models/register`.
- If a model requires significant preprocessing (lagged weather windows), prefer adding a pipeline in `app/services/` (similar to `lgbm_pipeline.py`) and expose a dedicated endpoint.

---

License: see `frontend/LICENSE`.
