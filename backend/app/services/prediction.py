"""
Service de prédiction: charge le modèle et orchestre la classification.
"""
import joblib
import numpy as np
from pathlib import Path
from functools import lru_cache

from app.core.config import settings
from app.schemas.prediction import (
    PredictionRequest, PredictionResponse,
    RiskLevel, StorageRecommendation,
    FeatureImportanceItem, FeatureImportanceResponse,
)
from app.ml.features import extract_features, FEATURE_NAMES, FEATURE_DESCRIPTIONS

RISK_LABELS = {0: RiskLevel.GREEN, 1: RiskLevel.ORANGE, 2: RiskLevel.RED}

STORAGE_MAP = {
    RiskLevel.GREEN: StorageRecommendation.SAFE,
    RiskLevel.ORANGE: StorageRecommendation.MONITOR,
    RiskLevel.RED: StorageRecommendation.AVOID,
}

MESSAGES = {
    RiskLevel.GREEN: "Risque faible. Stockage en silo autorisé sans restriction particulière.",
    RiskLevel.ORANGE: "Risque modéré. Stockage possible avec surveillance renforcée de l'humidité et de la température.",
    RiskLevel.RED: "Risque élevé. Stockage déconseillé. Analyse laboratoire recommandée avant toute décision logistique.",
}


@lru_cache(maxsize=1)
def _load_model():
    path = Path(settings.model_path)
    if not path.exists():
        raise FileNotFoundError(
            f"Modèle introuvable: {path}. Exécuter: python -m app.ml.train"
        )
    return joblib.load(path)


def predict(req: PredictionRequest) -> PredictionResponse:
    artifact = _load_model()
    clf = artifact["model"]
    accuracy = artifact["accuracy"]

    X = extract_features(req)
    proba = clf.predict_proba(X)[0]
    pred_class = int(np.argmax(proba))
    risk_level = RISK_LABELS[pred_class]
    risk_score = float(1 - proba[0])  # 0 = GREEN = low risk

    importances = clf.feature_importances_
    ranked = sorted(
        zip(FEATURE_NAMES, importances),
        key=lambda x: x[1],
        reverse=True,
    )
    top_factors = [
        FeatureImportanceItem(
            feature=name,
            importance=round(float(imp), 4),
            description=FEATURE_DESCRIPTIONS[name],
        )
        for name, imp in ranked[:5]
    ]

    return PredictionResponse(
        risk_level=risk_level,
        risk_score=round(risk_score, 4),
        storage_recommendation=STORAGE_MAP[risk_level],
        zen_ppb=req.sensor.zen_ppb,
        probabilities={
            "GREEN": round(float(proba[0]), 4),
            "ORANGE": round(float(proba[1]), 4),
            "RED": round(float(proba[2]), 4),
        },
        top_factors=top_factors,
        message=MESSAGES[risk_level],
    )


def get_feature_importance() -> FeatureImportanceResponse:
    artifact = _load_model()
    clf = artifact["model"]
    accuracy = artifact["accuracy"]

    importances = clf.feature_importances_
    ranked = sorted(
        zip(FEATURE_NAMES, importances),
        key=lambda x: x[1],
        reverse=True,
    )
    features = [
        FeatureImportanceItem(
            feature=name,
            importance=round(float(imp), 4),
            description=FEATURE_DESCRIPTIONS[name],
        )
        for name, imp in ranked
    ]
    return FeatureImportanceResponse(features=features, model_accuracy=round(accuracy, 4))
