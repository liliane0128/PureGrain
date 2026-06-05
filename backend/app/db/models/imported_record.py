from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ImportedRecord(Base):
    """Ligne importée depuis le CSV source."""

    __tablename__ = "imported_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    origin_country_code: Mapped[str | None] = mapped_column(String(10))
    origin_country_label_fr: Mapped[str | None] = mapped_column(String(100))

    reporting_country_code: Mapped[str | None] = mapped_column(String(10))
    reporting_country_name: Mapped[str | None] = mapped_column(String(100))

    sample_country_code: Mapped[str | None] = mapped_column(String(10))
    sample_country_name: Mapped[str | None] = mapped_column(String(100))

    sample_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sample_year: Mapped[int | None] = mapped_column(Integer)
    sample_month: Mapped[int | None] = mapped_column(Integer)
    sample_day: Mapped[int | None] = mapped_column(Integer)

    crop_group: Mapped[str | None] = mapped_column(String(100))
    product_name: Mapped[str | None] = mapped_column(String(200))
    sampling_point: Mapped[str | None] = mapped_column(String(100))
    param_name: Mapped[str | None] = mapped_column(String(100))

    zen_detected: Mapped[bool | None] = mapped_column(Boolean)
    zen_value_ug_kg: Mapped[float | None] = mapped_column(Float)
    lod_ug_kg: Mapped[float | None] = mapped_column(Float)
    loq_ug_kg: Mapped[float | None] = mapped_column(Float)

    result_status: Mapped[str | None] = mapped_column(String(100))
    result_type: Mapped[str | None] = mapped_column(String(100))

    origin_matches_reporting_country: Mapped[bool | None] = mapped_column(Boolean)
    origin_matches_sample_country: Mapped[bool | None] = mapped_column(Boolean)

    sampling_strategy: Mapped[str | None] = mapped_column(String(100))
    program_type: Mapped[str | None] = mapped_column(String(200))
    sample_method: Mapped[str | None] = mapped_column(Text)

    source_archive: Mapped[str | None] = mapped_column(String(255))
    source_file: Mapped[str | None] = mapped_column(Text)
    res_id_a: Mapped[str | None] = mapped_column(String(64), index=True)

    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)

    date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    temperature_2m_mean: Mapped[float | None] = mapped_column(Float)
    temperature_2m_max: Mapped[float | None] = mapped_column(Float)
    temperature_2m_min: Mapped[float | None] = mapped_column(Float)
    relative_humidity_2m_mean: Mapped[float | None] = mapped_column(Float)
    precipitation_sum: Mapped[float | None] = mapped_column(Float)
    cloud_cover_mean: Mapped[float | None] = mapped_column(Float)

    imported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )