from datetime import datetime
from pydantic import BaseModel

# Schémas pour la table Parcelle

class ParcelleBase(BaseModel):
    """Schéma de base pour une parcelle."""
    name: str
    location: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    cereal_type: str | None = None
    notes: str | None = None


class ParcelleCreate(ParcelleBase):
    """Schéma pour la création d'une parcelle (POST)"""
    pass


class ParcelleUpdate(ParcelleBase):
    """Schéma pour la mise à jour d'une parcelle (PATCH)"""
    pass


class ParcelleRead(ParcelleBase):
    """Schéma pour la consulation d'une parcelle (GET)"""
    id: int
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
