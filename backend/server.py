"""Main FastAPI app for the Urban Air Quality Intelligence Platform."""
import os
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from routes import router  # noqa: E402

app = FastAPI(title="Urban Air Quality Intelligence Platform")

app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("aqi-app")


@app.get("/")
async def root():
    return {"service": "Urban Air Quality Intelligence Platform", "status": "ok"}
