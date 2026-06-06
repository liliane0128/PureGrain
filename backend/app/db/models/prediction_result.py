from datetime import datetime, timezone
from sqlalchemy import ForeignKey, Float, String, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Prediction(Base):
    """ML model classification result, linked to an imported record."""
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    imported_record_id: Mapped[int | None] = mapped_column(
        ForeignKey("imported_records.id"), nullable=True, index=True
    )
    sensor_reading_id: Mapped[int | None] = mapped_column(nullable=True, index=True)

    risk_level: Mapped[str] = mapped_column(String(10), nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    storage_recommendation: Mapped[str] = mapped_column(String(10), nullable=False)

    prob_green: Mapped[float] = mapped_column(Float)
    prob_orange: Mapped[float] = mapped_column(Float)
    prob_red: Mapped[float] = mapped_column(Float)

    top_factors: Mapped[list] = mapped_column(JSON, nullable=False)

    predicted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
