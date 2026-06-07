# PureGrain

Plateforme DeepTech de prédiction du risque de contamination fongique (mycotoxines) dans les céréales.  
Développée pour le **Hackathon D4Gen 2026**.

---

## Concept

Un biocapteur portable mesure les taux de mycotoxines (ZEN, DON, Aflatoxines) directement sur la parcelle. PureGrain corrèle ces mesures avec les données météo historiques sur 60 jours pour prédire le risque de contamination avant la récolte et en silo.

**Pipeline :**
```
GPS (lat/lon)
      ↓
Open-Meteo API — 61 jours de météo horaire agrégée en journalier
      ↓
Ingénierie de features (75 variables : lags, statistiques, dérivées)
      ↓
LightGBM — classification ZEN / DON / Aflatoxines
      ↓
Risque FAIBLE / MODÉRÉ / ÉLEVÉ
```

Le modèle a été entraîné sur 675 échantillons de céréales européens avec données météo NASA POWER à 60 jours de lag.

---

## Stack

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

```bash
make up
```

Lance le backend (Docker) et le frontend en une seule commande.

- Interface : `http://localhost:3000`
- API : `http://localhost:8000/docs`

---

## Utilisation du simulateur

1. Ouvrir `http://localhost:3000`
2. Aller à la section **Simulateur agronomique**
3. Saisir une localisation dans la barre de recherche ou cliquer sur la carte
4. Sélectionner le type de céréale (Blé / Maïs / Orge)
5. Cliquer sur **Lancer la simulation**

**Scénarios de démonstration** (saisir dans la barre de recherche) :

| Ville | Céréale | Risque |
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
