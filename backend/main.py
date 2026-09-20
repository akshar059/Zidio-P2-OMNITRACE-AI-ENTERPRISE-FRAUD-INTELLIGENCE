"""
FastAPI Server Entrypoint
Configures CORS, static dashboard serving, artifact lifecycle loading, and API routing.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.routes import router as api_router, load_artifacts, simulator


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load ML models and stored metrics on startup
    load_artifacts()
    # Auto-start real-time dynamic transaction simulator stream
    simulator.start()
    print("[BACKEND] Continuous Dynamic Data Engine STARTED automatically.")
    yield
    simulator.stop()
    print("[BACKEND] Shutting down.")


app = FastAPI(
    title="OmniTrace AI — Financial Fraud Intelligence & Risk Scoring Engine",
    description="IEEE-CIS Fraud Detection Model with Real-Time Dashboard & Explainable AI",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for local development and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix="/api")

# Mount frontend directory for static assets
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")


@app.get("/")
def serve_dashboard():
    """Serves the main single-page fraud dashboard HTML."""
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "service": "Financial Fraud Detection API",
        "dashboard": "Frontend index.html not yet placed in /frontend"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
