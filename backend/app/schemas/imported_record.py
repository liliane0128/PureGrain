from datetime import datetime

from pydantic import BaseModel, Field


class ImportedRecordBase(BaseModel):
    """Schéma de base pour stocker une ligne du CSV en BDD."""
    origin_country_code: str | None = None
    origin_country_label_fr: str | None = None

    reporting_country_code: str | None = None
    reporting_country_name: str | None = None

    sample_country_code: str | None = None
    sample_country_name: str | None = None

    sample_date: datetime | None = None
    sample_year: int | None = None
    sample_month: int | None = None
    sample_day: int | None = None

    crop_group: str | None = None
    product_name: str | None = None
    sampling_point: str | None = None
    param_name: str | None = None

    zen_detected: bool | None = None
    zen_value_ug_kg: float | None = None
    lod_ug_kg: float | None = None
    loq_ug_kg: float | None = None

    result_status: str | None = None
    result_type: str | None = None

    origin_matches_reporting_country: bool | None = None
    origin_matches_sample_country: bool | None = None

    sampling_strategy: str | None = None
    program_type: str | None = None
    sample_method: str | None = None

    source_archive: str | None = None
    source_file: str | None = None
    res_id_a: str | None = None

    latitude: float | None = None
    longitude: float | None = None

    date: datetime | None = None

    temperature_2m_mean: float | None = None
    temperature_2m_max: float | None = None
    temperature_2m_min: float | None = None
    relative_humidity_2m_mean: float | None = None
    precipitation_sum: float | None = None
    cloud_cover_mean: float | None = None


class ImportedRecordCreate(ImportedRecordBase):
    """Créer une ligne importée du CSV."""
    pass


class ImportedRecordRead(ImportedRecordBase):
    """Lire une ligne complète depuis la base."""
    id: int
    imported_at: datetime

    model_config = {"from_attributes": True}


class MapDataItem(BaseModel):
    """Infos à envoyer au front."""
    id: int
    country_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    crop_group: str | None = None
    product_name: str | None = None
    zen_value_ug_kg: float | None = None
    risk_score: float | None = None
    risk_level: str | None = None
    sample_date: datetime | None = None

    model_config = {"from_attributes": True}