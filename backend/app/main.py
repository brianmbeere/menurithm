from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.routes import menu, inventory, sales, dish
from app.db.database import Base, engine
from dotenv import load_dotenv
import os

# Load env variables
load_dotenv()

app = FastAPI()

# Allowed origins from .env (comma-separated)
allowed_origins = os.getenv("ALLOWED_ORIGINS","")
origins = [origin.strip() for origin in allowed_origins.split(",")]


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(menu.router)
app.include_router(inventory.router)
app.include_router(sales.router)
app.include_router(dish.router)

Base.metadata.create_all(bind=engine)


port = int(os.environ.get("PORT", 8000))  # fallback to 8000 if not set
uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)