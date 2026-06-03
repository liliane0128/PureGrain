from datetime import datetime
from pydantic import BaseModel


class ParcelleCreate(BaseModel):
    name: str
    location: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    cereal_type: str | None = None
    notes: str | None = None


class ParcelleUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    cereal_type: str | None = None
    notes: str | None = None


class ParcelleRead(BaseModel):
    id: int
    name: str
    location: str | None
    latitude: float | None
    longitude: float | None
    cereal_type: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PredictionHistoryItem(BaseModel):
    id: int
    risk_level: str
    risk_score: float
    storage_recommendation: str
    zen_ppb: float
    predicted_at: datetime

    model_config = {"from_attributes": True}
