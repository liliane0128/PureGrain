from pydantic import BaseModel, Field
from enum import Enum


class RiskLevel(str, Enum):
    GREEN = "GREEN"
    ORANGE = "ORANGE"
    RED = "RED"


class StorageRecommendation(str, Enum):
    SAFE = "SAFE"       # Stockage silo sans restriction
    MONITOR = "MONITOR" # Stockage avec surveillance renforcée
    AVOID = "AVOID"     # Ne pas stocker, traitement requis


# ── Input ────────────────────────────────────────────────────────────────────

class WeatherWindow(BaseModel):
    """Fenêtre météo historique (24h ou 48h)."""
    temperature_mean: float = Field(..., description="Température moyenne (°C)")
    humidity_mean: float = Field(..., description="Humidité relative moyenne (%)")
    temperature_max: float = Field(..., description="Température maximale (°C)")
    temperature_min: float = Field(..., description="Température minimale (°C)")


class SensorReading(BaseModel):
    """Mesure du capteur portatif PureGrain."""
    zen_ppb: float = Field(..., ge=0, description="Zéaralénone mesurée (µg/kg = ppb)")
    grain_moisture_pct: float = Field(..., ge=0, le=100, description="Humidité du grain (%)")


class PredictionRequest(BaseModel):
    sensor: SensorReading
    weather_24h: WeatherWindow
    weather_48h: WeatherWindow
    temperature_current: float = Field(..., description="Température actuelle (°C)")
    humidity_current: float = Field(..., ge=0, le=100, description="Humidité actuelle (%)")
    days_since_harvest: int = Field(..., ge=0, description="Jours depuis la récolte")

    model_config = {
        "json_schema_extra": {
            "example": {
                "sensor": {"zen_ppb": 45.0, "grain_moisture_pct": 14.5},
                "weather_24h": {
                    "temperature_mean": 22.0, "humidity_mean": 78.0,
                    "temperature_max": 27.0, "temperature_min": 17.0
                },
                "weather_48h": {
                    "temperature_mean": 21.5, "humidity_mean": 80.0,
                    "temperature_max": 28.0, "temperature_min": 16.0
                },
                "temperature_current": 24.0,
                "humidity_current": 82.0,
                "days_since_harvest": 3
            }
        }
    }


# ── Output ───────────────────────────────────────────────────────────────────

class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float
    description: str


class PredictionResponse(BaseModel):
    risk_level: RiskLevel
    risk_score: float = Field(..., ge=0, le=1, description="Score de risque continu [0-1]")
    storage_recommendation: StorageRecommendation
    zen_ppb: float
    probabilities: dict[str, float] = Field(..., description="Probabilités par classe")
    top_factors: list[FeatureImportanceItem]
    message: str


class FeatureImportanceResponse(BaseModel):
    features: list[FeatureImportanceItem]
    model_accuracy: float
