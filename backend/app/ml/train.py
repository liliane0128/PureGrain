"""
Génération de données synthétiques + entraînement du Random Forest.
Exécuter une fois: python -m app.ml.train
"""
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

from app.ml.features import FEATURE_NAMES

RANDOM_STATE = 42
N_SAMPLES = 5000
MODEL_PATH = Path(__file__).parent.parent / "data" / "model.joblib"


def generate_synthetic_data(n: int = N_SAMPLES) -> pd.DataFrame:
    """
    Simule des cinétiques de contamination fongique basées sur:
    - Règles biologiques: ZEN augmente avec humidité > 70% et temp 15-30°C
    - Seuil réglementaire EU: 100 µg/kg pour céréales non transformées
    """
    rng = np.random.default_rng(RANDOM_STATE)

    temp_mean_48h = rng.uniform(5, 35, n)
    temp_mean_24h = temp_mean_48h + rng.normal(0, 2, n)
    temp_current = temp_mean_24h + rng.normal(0, 1.5, n)

    humidity_mean_48h = rng.uniform(40, 98, n)
    humidity_mean_24h = humidity_mean_48h + rng.normal(0, 5, n).clip(-20, 20)
    humidity_current = humidity_mean_24h + rng.normal(0, 3, n)

    thermal_amplitude_24h = rng.uniform(2, 15, n)
    thermal_amplitude_48h = rng.uniform(2, 18, n)
    grain_moisture_pct = rng.uniform(10, 25, n)
    days_since_harvest = rng.integers(0, 60, n)

    # Simulation biologique de ZEN (µg/kg)
    # Facteurs favorisant la production: humidité > 70%, temp 15-30°C
    humidity_risk = np.clip((humidity_mean_48h - 60) / 40, 0, 1)
    temp_risk = 1 - np.abs(temp_mean_48h - 22) / 17  # optimal ~22°C
    temp_risk = np.clip(temp_risk, 0, 1)
    duration_risk = np.clip(days_since_harvest / 30, 0, 1)

    base_zen = (
        humidity_risk * 80
        + temp_risk * 60
        + duration_risk * 40
        + grain_moisture_pct * 2
        + rng.exponential(15, n)
    )
    zen_ppb = np.clip(base_zen, 0, 500)

    # Feature interactions
    humidity_trend = humidity_mean_24h - humidity_mean_48h
    temp_x_humidity_24h = temp_mean_24h * humidity_mean_24h / 100
    zen_x_moisture = zen_ppb * grain_moisture_pct / 100

    # Labels (règlement EU + risque stockage)
    # GREEN  : ZEN < 50 ET risque faible
    # ORANGE : ZEN 50-100 OU conditions favorables
    # RED    : ZEN > 100 OU risque très élevé
    composite_risk = humidity_risk * 0.4 + temp_risk * 0.3 + duration_risk * 0.15 + (zen_ppb / 500) * 0.15
    labels = np.where(
        (zen_ppb > 100) | (composite_risk > 0.75),
        2,  # RED
        np.where(
            (zen_ppb > 50) | (composite_risk > 0.45),
            1,  # ORANGE
            0   # GREEN
        )
    )

    df = pd.DataFrame({
        "zen_ppb": zen_ppb,
        "grain_moisture_pct": grain_moisture_pct,
        "temp_current": temp_current,
        "humidity_current": humidity_current,
        "temp_mean_24h": temp_mean_24h,
        "humidity_mean_24h": humidity_mean_24h,
        "thermal_amplitude_24h": thermal_amplitude_24h,
        "temp_mean_48h": temp_mean_48h,
        "humidity_mean_48h": humidity_mean_48h,
        "thermal_amplitude_48h": thermal_amplitude_48h,
        "humidity_trend": humidity_trend,
        "temp_x_humidity_24h": temp_x_humidity_24h,
        "days_since_harvest": days_since_harvest,
        "zen_x_moisture": zen_x_moisture,
        "label": labels,
    })
    return df


def train_and_save():
    print("Génération des données synthétiques...")
    df = generate_synthetic_data()
    print(f"Distribution des classes:\n{df['label'].value_counts().sort_index()}")

    X = df[FEATURE_NAMES].values
    y = df["label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    print("\nEntraînement du Random Forest...")
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=10,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    report = classification_report(y_test, y_pred, target_names=["GREEN", "ORANGE", "RED"])
    print(f"\nRapport de classification:\n{report}")

    accuracy = (y_pred == y_test).mean()
    print(f"Accuracy: {accuracy:.3f}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": clf, "accuracy": accuracy, "feature_names": FEATURE_NAMES}, MODEL_PATH)
    print(f"\nModèle sauvegardé: {MODEL_PATH}")

    return clf, accuracy


if __name__ == "__main__":
    train_and_save()
