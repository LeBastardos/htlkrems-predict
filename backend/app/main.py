from pathlib import Path
import asyncio

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api import api_router
from app.core.config import settings
from app.db.base import create_db_and_tables


frontend_dir = Path(__file__).resolve().parents[2] / "frontend"

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
async def on_startup() -> None:
    create_db_and_tables()
    try:
        # start background scheduler tasks for recurring markets and cleanup
        import app.services.recurring_service as recurring_service
        import app.services.cleanup_service as cleanup_service
        asyncio.create_task(recurring_service.run_scheduler())
        asyncio.create_task(cleanup_service.run_cleanup_loop())
    except Exception:
        pass

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "active", "system": "Wett-Plattform HTL Krems"}


if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)