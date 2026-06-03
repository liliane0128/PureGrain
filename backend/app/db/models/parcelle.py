from datetime import datetime, timezone
from sqlalchemy import String, Float, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Parcelle(Base):
    """Parcelle agricole surveillée par PureGrain."""
    __tablename__ = "parcelles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    location: Mapped[str | None] = mapped_column(String(200))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    cereal_type: Mapped[str | None] = mapped_column(String(50))  # blé, maïs, orge…
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    sensor_readings: Mapped[list["SensorReading"]] = relationship(  # noqa: F821
        back_populates="parcelle", cascade="all, delete-orphan"
    )
