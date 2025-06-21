from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import menu

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local dev; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(menu.router)

