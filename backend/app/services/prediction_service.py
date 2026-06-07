import asyncio
import io
import os
import glob
import json
from typing import Dict, Any

import joblib
import pandas as pd


_model_cache: dict[str, object] = {}


def _safe_load_model(path: str):
    if path in _model_cache:
        return _model_cache[path]
    if not os.path.exists(path):
        return None
    model = joblib.load(path)
    _model_cache[path] = model
    return model


def _predict_with_model(model, df: pd.DataFrame):
    try:
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(df)
            if probs.ndim == 2 and probs.shape[1] > 1:
                return float(probs[:, 1].mean())
            return float(probs.mean())
        else:
            preds = model.predict(df)
            return float(preds.mean())
    except Exception:
        return None


def _discover_models_from_weights_dir(weights_dir: str):
    """Scan a weights directory and return discovered models with optional metadata.

    Returns list of dicts: { 'strain': str, 'weight_path': str, 'accuracy': float|None }
    """
    out = []
    patterns = ["*.joblib", "*.pkl", "*.sav"]
    for pat in patterns:
        for path in glob.glob(os.path.join(weights_dir, pat)):
            name = os.path.splitext(os.path.basename(path))[0]
            meta_path = path + ".meta.json"
            accuracy = None
            if os.path.exists(meta_path):
                try:
                    with open(meta_path, "r", encoding="utf8") as fh:
                        meta = json.load(fh)
                        accuracy = float(meta.get("accuracy")) if meta.get("accuracy") is not None else None
                except Exception:
                    accuracy = None
            out.append({"strain": name, "weight_path": path, "accuracy": accuracy})
    return out


async def predict_risks_from_csv(content: bytes, db=None) -> Dict[str, Dict[str, float]]:
    """Compatibility wrapper kept for CSV uploads that will read models from disk (no DB required).

    If `db` is supplied (legacy), it is ignored.
    """
    df = pd.read_csv(io.BytesIO(content))
    # create single-row DataFrame or use full CSV depending on model expectations
    return await predict_risks_from_df(df)


async def predict_risks_from_df(df: pd.DataFrame, weights_dir: str | None = None) -> Dict[str, Dict[str, Any]]:
    """Run all models found in `weights_dir` (or default) on the provided DataFrame.

    Returns dict { strain: { 'incertitude': float|None, 'accuracy': float|None } }
    """
    if weights_dir is None:
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
        weights_dir = os.path.join(repo_root, "backend/app/ml/weights")

    models = _discover_models_from_weights_dir(weights_dir)

    def _compute():
        out: Dict[str, Dict[str, Any]] = {}
        for entry in models:
            strain = entry["strain"]
            weight_path = entry["weight_path"]
            model = _safe_load_model(weight_path)
            prob = None
            if model is not None:
                prob = _predict_with_model(model, df)
            incertitude = round(prob * 100, 2) if prob is not None else None
            accuracy = round(float(entry.get("accuracy")), 2) if entry.get("accuracy") is not None else None
            out[strain] = {"incertitude": incertitude, "accuracy": accuracy}
        return out

    return await asyncio.to_thread(_compute)


async def predict_risks_from_features(features: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Convenience: accept a single-feature dict (from weather + lat/lon), build a one-row DataFrame and run models."""
    df = pd.DataFrame([features])
    return await predict_risks_from_df(df)
