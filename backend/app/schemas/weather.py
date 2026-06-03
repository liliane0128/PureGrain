from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.prediction import SensorReading, PredictionResponse


class AutoPredictionRequest(BaseModel):
    """
    Simplified prediction request: sensor data + days since harvest only.
    Weather is fetched automatically from Open-Meteo using the parcelle coordinates.
    """
    sensor: SensorReading
    days_since_harvest: int = Field(..., ge=0, description="Days since last harvest")

    model_config = {
        "json_schema_extra": {
            "example": {
                "sensor": {"zen_ppb": 75.0, "grain_moisture_pct": 15.5},
                "days_since_harvest": 4,
            }
        }
    }


class AutoPredictionResponse(PredictionResponse):
    """Prediction result enriched with the weather snapshot used as input."""
    weather_fetched_at: datetime
    current_temperature: float
    current_humidity: float
    temp_mean_24h: float
    humidity_mean_24h: float
    temp_mean_48h: float
    humidity_mean_48h: float
