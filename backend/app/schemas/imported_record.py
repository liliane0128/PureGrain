from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ImportedRecordBase(BaseModel):
    sample_id: str | None = None
    source_dataset: str | None = None
    crop_type: str | None = None
    location_country: str | None = None
    location_continent: str | None = None
    timestamp: datetime | None = None
    sample_year: int | None = None
    toxin_name: str | None = None
    toxin_value_raw: str | None = None
    toxin_unit: str | None = None
    toxin_value_standardized_ug_kg: float | None = None
    toxin_detected: bool | None = None
    fungal_species: str | None = None
    association_type: str | None = None
    original_metadata: str | None = None


class ImportedRecordCreate(ImportedRecordBase):
    pass


class ImportedRecordRead(ImportedRecordBase):
    id: int
    imported_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MapDataItem(BaseModel):
    id: int
    country_name: str | None = None
    crop_type: str | None = None
    toxin_name: str | None = None
    toxin_value_standardized_ug_kg: float | None = None
    toxin_detected: bool | None = None
    fungal_species: str | None = None
    association_type: str | None = None
    sample_year: int | None = None
    timestamp: datetime | None = None

    model_config = ConfigDict(from_attributes=True)