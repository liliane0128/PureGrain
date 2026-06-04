from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    app_name: str = "PureGrain API"
    version: str = "0.1.0"
    debug: bool = os.getenv("DEBUG")

    # CORS — frontend origin
    cors_origins: list[str] = ["https://puregrain.fr", "http://localhost:3000", "http://localhost:5173"]

    # Model artifact path (relative to backend/)
    model_path: str = "app/data/model.joblib"

    # Database
    database_url: str = os.getenv("DATABASE_URL")

    class Config:
        env_file = ".env"


settings = Settings()
