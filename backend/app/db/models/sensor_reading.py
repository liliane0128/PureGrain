from datetime import datetime, timezone
from sqlalchemy import ForeignKey, Float, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class SensorReading(Base):
    """Mesure brute du capteur PureGrain + données météo associées."""
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    parcelle_id: Mapped[int] = mapped_column(ForeignKey("parcelles.id"), index=True)

    # Capteur
    zen_ppb: Mapped[float] = mapped_column(Float, nullable=False)
    grain_moisture_pct: Mapped[float] = mapped_column(Float, nullable=False)

    # Météo actuelle
    temperature_current: Mapped[float] = mapped_column(Float)
    humidity_current: Mapped[float] = mapped_column(Float)

    # Fenêtre 24h
    temp_mean_24h: Mapped[float] = mapped_column(Float)
    humidity_mean_24h: Mapped[float] = mapped_column(Float)
    temp_max_24h: Mapped[float] = mapped_column(Float)
    temp_min_24h: Mapped[float] = mapped_column(Float)

    # Fenêtre 48h
    temp_mean_48h: Mapped[float] = mapped_column(Float)
    humidity_mean_48h: Mapped[float] = mapped_column(Float)
    temp_max_48h: Mapped[float] = mapped_column(Float)
    temp_min_48h: Mapped[float] = mapped_column(Float)

    days_since_harvest: Mapped[int] = mapped_column(Integer)

    measured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    parcelle: Mapped["Parcelle"] = relationship(back_populates="sensor_readings")  # noqa: F821
    prediction: Mapped["Prediction | None"] = relationship(  # noqa: F821
        back_populates="sensor_reading", uselist=False, cascade="all, delete-orphan"
    )
