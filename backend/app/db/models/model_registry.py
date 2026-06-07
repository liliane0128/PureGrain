from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.db.base import Base


class ModelRegistry(Base):
    __tablename__ = "model_registry"

    id = Column(Integer, primary_key=True)
    strain = Column(String(128), nullable=False, unique=True)
    weight_path = Column(String(512), nullable=False)
    accuracy = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
