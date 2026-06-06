"""
Train weather-based binary ZEN classifier on real European cereal data.
Run: python -m app.ml.train_weather
Data: app/training_data/weather_added_1.csv (included in Docker image)
"""
import sys
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import roc_auc_score

MODEL_PATH = Path(__file__).parent.parent / "data" / "model_weather.joblib"
DATA_PATH = Path(__file__).parent.parent / "training_data" / "weather_added_1.csv"

_LEAKY = [
    "zen_value_ug_kg", "result_status", "result_type",
    "lod_ug_kg", "loq_ug_kg", "param_name",
    "origin_matches_reporting_country", "origin_matches_sample_country",
    "product_name",
    "resId_A", "source_archive", "program_type", "sample_method", "source_file",
    "date", "sample_date",
    "origin_country_code", "reporting_country_code", "reporting_country_name",
    "sample_country_code", "sample_country_name",
]
_CAT_COLS = ["origin_country_label_fr", "crop_group", "sampling_point", "sampling_strategy"]
RANDOM_STATE = 42


def train_and_save() -> float | None:
    if not DATA_PATH.exists():
        print(f"Training data not found at {DATA_PATH}. Skipping weather model.")
        return None

    print(f"Loading {DATA_PATH.name} ({DATA_PATH.stat().st_size // 1024} KB)...")
    df = pd.read_csv(DATA_PATH)

    df_ml = df.drop(columns=[c for c in _LEAKY if c in df.columns]).copy()
    df_ml["target"] = (df_ml["zen_detected"] == "yes").astype(int)
    df_ml = df_ml.drop(columns=["zen_detected"])

    df_ml["month_sin"] = np.sin(2 * np.pi * df_ml["sample_month"] / 12)
    df_ml["month_cos"] = np.cos(2 * np.pi * df_ml["sample_month"] / 12)
    df_ml["temp_x_humidity"] = (
        df_ml["temperature_2m_mean"] * df_ml["relative_humidity_2m_mean"] / 100
    )
    df_ml["temp_range"] = df_ml["temperature_2m_max"] - df_ml["temperature_2m_min"]

    encoders: dict = {}
    for col in _CAT_COLS:
        le = LabelEncoder()
        df_ml[col] = le.fit_transform(df_ml[col].astype(str))
        encoders[col] = le

    feature_cols = [c for c in df_ml.columns if c != "target"]
    X, y = df_ml[feature_cols], df_ml["target"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    print(f"Training Random Forest on {len(X_train)} samples "
          f"({y_train.mean():.0%} positive class)...")
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        min_samples_leaf=4,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)

    roc_auc = roc_auc_score(y_test, rf.predict_proba(X_test)[:, 1])
    print(f"ROC-AUC: {roc_auc:.3f}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "model": rf,
        "feature_cols": list(feature_cols),
        "encoders": encoders,
        "roc_auc": roc_auc,
    }, MODEL_PATH)
    print(f"Weather model saved → {MODEL_PATH}")
    return roc_auc


if __name__ == "__main__":
    result = train_and_save()
    sys.exit(0 if result is not None else 1)
