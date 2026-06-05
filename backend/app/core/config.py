from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "PureGrain API"
    version: str = "0.1.0"
    debug: bool = False

    # CORS — frontend origin
    cors_origins: list[str] = ["https://puregrain.fr", "http://localhost:3000", "http://localhost:5173"]

    # Model artifact path (relative to backend/)
    model_path: str = "app/data/model.joblib"

    # Database
    database_url: str = "postgresql+asyncpg://puregrain:puregrain@localhost:5432/puregrain"

    class Config:
        env_file = ".env"


settings = Settings()
