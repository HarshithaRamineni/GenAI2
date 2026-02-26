"""ResearchPilot FastAPI application entry point."""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db
from app.routers import papers, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    settings = get_settings()
    # Create required directories
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.vector_store_dir, exist_ok=True)
    # Initialize database
    await init_db()
    print("✅ ResearchPilot backend started")
    yield
    print("👋 ResearchPilot backend shutting down")


app = FastAPI(
    title="ResearchPilot API",
    description="Autonomous Multi-Agent Research Intelligence Hub",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(papers.router)
app.include_router(chat.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "ResearchPilot"}
