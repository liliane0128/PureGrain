# PureGrain

Predictive detection of fungal contamination (mycotoxins) in cereal crops.  
Built for the **D4Gen 2026 Hackathon**.

A portable biosensor measures Zearalenone (ZEN) levels in the field. PureGrain correlates that reading with historical weather data to predict contamination risk before harvest and during silo storage.

---

## How it works

```
Sensor reading (ZEN ppb)
        +
GPS coordinates  →  Open-Meteo API  →  48h temp & humidity
        ↓
  Feature engineering (14 features)
        ↓
  Random Forest classifier
        ↓
  GREEN / ORANGE / RED  +  storage recommendation
```

---

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, Python 3.12 |
| ML | scikit-learn (Random Forest) |
| Database | PostgreSQL 16 + SQLAlchemy async + Alembic |
| Weather | Open-Meteo API (free, no key) |
| Infra | Docker Compose |

---

## Quick start

```bash
make up        # build + start db & api
make logs      # follow logs
```

The API trains the model and runs migrations automatically on first start.

**Swagger UI:** `http://localhost:8000/docs`

---

## Key endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/predict/auto?parcelle_id=1` | Predict risk (weather fetched automatically) |
| `POST` | `/api/v1/predict/` | Predict risk (manual weather input) |
| `GET` | `/api/v1/predict/features/importance` | RF feature importances |
| `POST` | `/api/v1/parcelles/` | Create a field (requires lat/lon) |
| `GET` | `/api/v1/parcelles/{id}/history` | Prediction history for a field |
| `GET` | `/health` | Service + model status |

---

## Other commands

```bash
make retrain      # force retrain the Random Forest
make migrate      # apply Alembic migrations
make psql         # open a psql shell
make clean        # stop containers and delete volumes
```
