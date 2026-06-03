"""
Open-Meteo weather service.
Fetches hourly temperature and humidity for the past 48h given lat/lon,
then computes 24h and 48h statistical windows.
API docs: https://open-meteo.com/en/docs  — free, no API key required.
"""
import httpx
from datetime import datetime, timezone
from dataclasses import dataclass

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


@dataclass
class WeatherWindow:
    temperature_mean: float // average temperature over the window
    humidity_mean: float // average humidity over the window
    temperature_max: float
    temperature_min: float
    temperature_amplitude: float // max - min


@dataclass
class WeatherSnapshot:
    current_temperature: float
    current_humidity: float
    window_24h: WeatherWindow
    window_48h: WeatherWindow
    fetched_at: datetime
    raw_temp_48h: list[float] // raw hourly temperatures for the last 48h (after filtering out None)
    raw_humidity_48h: list[float] // raw hourly humidity values for the last 48h (after filtering out None) 


def _compute_window(temps: list[float], humids: list[float]) -> WeatherWindow:
    t_max = round(max(temps), 2) // round to 2 decimals for consistency
    t_min = round(min(temps), 2)
    return WeatherWindow(
        temperature_mean=round(sum(temps) / len(temps), 2),
        humidity_mean=round(sum(humids) / len(humids), 2),
        temperature_max=t_max,
        temperature_min=t_min,
        temperature_amplitude=round(t_max - t_min, 2),
    )


async def fetch_weather(lat: float, lon: float) -> WeatherSnapshot:
    """
    Fetch the last 48h of hourly data from Open-Meteo and return
    24h and 48h statistical windows.
    past_days=2 guarantees enough history; forecast_days=1 ensures
    the current hour always has a data point.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,relative_humidity_2m", 
        "past_days": 2,
        "forecast_days": 1,
        "timezone": "auto",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(OPEN_METEO_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
    times: list[str] = data["hourly"]["time"]
    temps: list[float | None] = data["hourly"]["temperature_2m"]
    humids: list[float | None] = data["hourly"]["relative_humidity_2m"]

    # Find the index closest to now (most recent past hour)
    now_ts = datetime.now(timezone.utc).timestamp()
    best_idx = 0
    best_diff = float("inf")
    for i, t in enumerate(times):
        # Open-Meteo returns ISO8601; timezone may or may not be present
        try:
            dt = datetime.fromisoformat(t)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        diff = abs(dt.timestamp() - now_ts)
        if diff < best_diff:
            best_diff = diff
            best_idx = i

    # Slice the 48 hours ending at current index; filter out None values
    start_48 = max(0, best_idx - 47)
    raw_48 = list(zip(
        temps[start_48: best_idx + 1],
        humids[start_48: best_idx + 1],
    ))
    clean_48 = [(t, h) for t, h in raw_48 if t is not None and h is not None]

    if len(clean_48) < 2:
        raise ValueError(
            "Open-Meteo returned insufficient data points. "
            "Check that the coordinates are valid."
        )

    temps_48 = [t for t, _ in clean_48]
    humids_48 = [h for _, h in clean_48]

    # 24h window = last 24 hourly points
    temps_24 = temps_48[-24:] if len(temps_48) >= 24 else temps_48
    humids_24 = humids_48[-24:] if len(humids_48) >= 24 else humids_48

    return WeatherSnapshot(
        current_temperature=round(temps_48[-1], 2),
        current_humidity=round(humids_48[-1], 2),
        window_24h=_compute_window(temps_24, humids_24),
        window_48h=_compute_window(temps_48, humids_48),
        fetched_at=datetime.now(timezone.utc),
        raw_temp_48h=temps_48,
        raw_humidity_48h=humids_48,
    )


def snapshot_to_model_features(snap: WeatherSnapshot) -> dict:
    return {
        "temp_avg_7d": snap.window_48h.temperature_mean,
        "temp_amplitude_7d": snap.window_48h.temperature_amplitude,
        "humidity_last_48h": snap.raw_humidity_48h,
        "humidity_cumulative_48h": round(sum(snap.raw_humidity_48h), 2),
        "current_temperature": snap.current_temperature,
        "current_humidity": snap.current_humidity,
    }
