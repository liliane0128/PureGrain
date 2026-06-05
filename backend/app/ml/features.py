"""
Feature engineering: transforme les inputs bruts en vecteur pour le Random Forest.
"""
import numpy as np
from app.schemas.prediction import PredictionRequest


FEATURE_NAMES = [
    "zen_ppb",
    "grain_moisture_pct",
    "temp_current",
    "humidity_current",
    "temp_mean_24h",
    "humidity_mean_24h",
    "thermal_amplitude_24h",
    "temp_mean_48h",
    "humidity_mean_48h",
    "thermal_amplitude_48h",
    "humidity_trend",        
    "temp_x_humidity_24h",   
    "days_since_harvest",
    "zen_x_moisture",  
]

FEATURE_DESCRIPTIONS = {
    "zen_ppb": "Zéaralénone mesurée par le capteur (µg/kg)",
    "grain_moisture_pct": "Humidité du grain (%)",
    "temp_current": "Température actuelle (°C)",
    "humidity_current": "Humidité actuelle (%)",
    "temp_mean_24h": "Température moyenne sur 24h (°C)",
    "humidity_mean_24h": "Humidité moyenne sur 24h (%)",
    "thermal_amplitude_24h": "Amplitude thermique sur 24h (°C)",
    "temp_mean_48h": "Température moyenne sur 48h (°C)",
    "humidity_mean_48h": "Humidité moyenne sur 48h (%)",
    "thermal_amplitude_48h": "Amplitude thermique sur 48h (°C)",
    "humidity_trend": "Tendance humidité (48h→24h)",
    "temp_x_humidity_24h": "Interaction température × humidité 24h",
    "days_since_harvest": "Jours depuis la récolte",
    "zen_x_moisture": "Interaction capteur ZEN × humidité grain",
}


def extract_features(req: PredictionRequest) -> np.ndarray:
    """Retourne un vecteur 1D de features dans l'ordre FEATURE_NAMES."""
    thermal_24h = req.weather_24h.temperature_max - req.weather_24h.temperature_min
    thermal_48h = req.weather_48h.temperature_max - req.weather_48h.temperature_min
    humidity_trend = req.weather_24h.humidity_mean - req.weather_48h.humidity_mean
    temp_x_hum_24h = req.weather_24h.temperature_mean * req.weather_24h.humidity_mean / 100
    zen_x_moisture = req.sensor.zen_ppb * req.sensor.grain_moisture_pct / 100

    return np.array([[
        req.sensor.zen_ppb,
        req.sensor.grain_moisture_pct,
        req.temperature_current,
        req.humidity_current,
        req.weather_24h.temperature_mean,
        req.weather_24h.humidity_mean,
        thermal_24h,
        req.weather_48h.temperature_mean,
        req.weather_48h.humidity_mean,
        thermal_48h,
        humidity_trend,
        temp_x_hum_24h,
        req.days_since_harvest,
        zen_x_moisture,
    ]])
