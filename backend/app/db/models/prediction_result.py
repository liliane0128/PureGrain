from datetime import datetime, timezone
from sqlalchemy import DateTime, Float, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    crop_group: Mapped[str] = mapped_column(String(50), nullable=False)
    zen_probability: Mapped[float] = mapped_column(Float, nullable=False)
    don_probability: Mapped[float] = mapped_column(Float, nullable=False)
    afla_probability: Mapped[float] = mapped_column(Float, nullable=False)
    contamination_probability: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(10), nullable=False)
    weather: Mapped[dict] = mapped_column(JSON, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
