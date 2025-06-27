from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load env variables
load_dotenv()


def setup_cors(app: FastAPI):
    # Allowed origins from .env (comma-separated)
    allowed_origins = os.getenv("ALLOWED_ORIGINS","")
    origins = [origin.strip() for origin in allowed_origins.split(",")]
    
    print(f"[CORS] Allowed origins: {origins}")  # Log the origins for debugging
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )