# PureGrain

Plateforme DeepTech de prédiction du risque de contamination fongique (mycotoxines) dans les céréales.  
Développée pour le **Hackathon D4Gen 2026**.

---
# PureGrain

## Concept

Un biocapteur portable mesure les taux de mycotoxines (ZEN, DON, Aflatoxines) directement sur la parcelle. PureGrain corrèle ces mesures avec les données météo historiques sur 60 jours pour prédire le risque de contamination avant la récolte et en silo.

**Pipeline :**
```
GPS (lat/lon)
      ↓
Open-Meteo API — 61 jours de météo horaire agrégée en journalier
      ↓
Ingénierie de features (75 features : lags, stats, dérivées)
      ↓
LightGBM — classification ZEN / DON / Aflatoxines
      ↓
Risque FAIBLE / MODÉRÉ / ÉLEVÉ
```

Le modèle (`toxin_detection_classifier.txt`) a été entraîné sur 675 échantillons de céréales européens avec données météo NASA POWER à 60 jours de lag.

---

**Key concepts**

| Couche | Technologie |
|---|---|
| Backend | FastAPI + Python 3.11 |
| ML | LightGBM |
| Base de données | PostgreSQL 16 + SQLAlchemy async + Alembic |
| Météo | Open-Meteo API (gratuit, sans clé) |
| Frontend | Next.js 15 + React 19 + TypeScript |
| Infra | Docker Compose |

---

## Lancement

### Backend (Docker)

```bash
docker compose up --build
```

L'API est disponible sur `http://localhost:8000`.  
Documentation interactive : `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Le site est disponible sur `http://localhost:3000`.

---

## Utilisation du simulateur

1. Ouvrir `http://localhost:3000`
2. Naviguer jusqu'à la section **Simulateur agronomique**
3. Rechercher une parcelle via la barre de recherche ou cliquer sur la carte
4. Sélectionner le type de céréale (Blé / Maïs / Orge)
5. Cliquer sur **Lancer la simulation**

**Scénarios de démonstration** (saisir dans la barre de recherche) :

| Ville | Céréale | Risque attendu |
|---|---|---|
| Tours | Blé | 🟢 Faible |
| Bordeaux | Maïs | 🟡 Modéré |
| Amiens | Blé | 🔴 Élevé |

---

## Endpoint principal

```
POST /api/v1/predict/full
{
  "lat": 49.89,
  "lon": 2.30,
  "crop_group": "wheat"
}
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
