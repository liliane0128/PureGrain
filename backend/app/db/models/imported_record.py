from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ImportedRecord(Base):
    """Ligne importée depuis le CSV source."""

    __tablename__ = "imported_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    sample_id: Mapped[str | None] = mapped_column(String(100), index=True)
    source_dataset: Mapped[str | None] = mapped_column(Text)
    crop_type: Mapped[str | None] = mapped_column(String(255))

    location_country: Mapped[str | None] = mapped_column(String(100), index=True)
    location_continent: Mapped[str | None] = mapped_column(String(100), index=True)

    timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    sample_year: Mapped[int | None] = mapped_column(Integer, index=True)

    toxin_name: Mapped[str | None] = mapped_column(String(150), index=True)
    toxin_value_raw: Mapped[str | None] = mapped_column(Text)
    toxin_unit: Mapped[str | None] = mapped_column(String(50))
    toxin_value_standardized_ug_kg: Mapped[float | None] = mapped_column(Float, index=True)
    toxin_detected: Mapped[bool | None] = mapped_column(Boolean, index=True)

    fungal_species: Mapped[str | None] = mapped_column(String(150), index=True)
    association_type: Mapped[str | None] = mapped_column(String(100), index=True)

    original_metadata: Mapped[str | None] = mapped_column(Text)

    imported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )