from datetime import datetime, timezone
from sqlalchemy import ForeignKey, Float, String, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Prediction(Base):
    """Résultat de classification du modèle Random Forest."""
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    sensor_reading_id: Mapped[int] = mapped_column(
        ForeignKey("sensor_readings.id"), unique=True, index=True
    )

    risk_level: Mapped[str] = mapped_column(String(10), nullable=False)  # GREEN/ORANGE/RED
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    storage_recommendation: Mapped[str] = mapped_column(String(10), nullable=False)

    prob_green: Mapped[float] = mapped_column(Float)
    prob_orange: Mapped[float] = mapped_column(Float)
    prob_red: Mapped[float] = mapped_column(Float)

    # Top features JSON: [{"feature": "zen_ppb", "importance": 0.44, "description": "..."}]
    top_factors: Mapped[list] = mapped_column(JSON, nullable=False)

    predicted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    sensor_reading: Mapped["SensorReading"] = relationship(back_populates="prediction")  # noqa: F821
