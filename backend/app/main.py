from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import health, predict


@asynccontextmanager
async def lifespan(app: FastAPI):
    import app.db.models  # noqa: F401
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="API prédictive de contamination fongique (mycotoxines) pour PureGrain.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(predict.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"name": settings.app_name, "version": settings.version, "docs": "/docs"}
