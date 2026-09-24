from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.data_store import data_store
from app.routers import dashboard, invoices

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    data_store.load()
    yield


app = FastAPI(title="AR Invoice Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(invoices.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# Serves the built React app (frontend/dist) from the same origin as the API, so a
# single process/tunnel covers both — added last so it never shadows /api routes.
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
