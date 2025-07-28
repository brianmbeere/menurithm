from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.routes import user, menu, inventory, sales, dish, csv_help, csv_validation, advanced_inventory, test_auth
from app.db.database import Base, engine
from app.core.config import setup_cors
from app.utils.auth_config import get_auth_config
import os
import logging

# Enhanced logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get authentication configuration
auth_config = get_auth_config()

app = FastAPI(
    title="Menurithm API",
    description="Advanced Restaurant Inventory Management with AI/ML Predictions & Enhanced Security",
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enhanced CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=auth_config.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers with enhanced security
app.include_router(menu.router)
app.include_router(inventory.router)
app.include_router(sales.router)
app.include_router(dish.router)
app.include_router(user.router, prefix="/users", tags=["Users"])
app.include_router(csv_help.router, prefix="/csv", tags=["CSV Help"])
app.include_router(csv_validation.router, prefix="/csv", tags=["CSV Validation"])

# Enhanced inventory management with AI
app.include_router(advanced_inventory.router, tags=["Advanced AI Inventory"])

# Test and demo routes for non-user access
app.include_router(test_auth.router, tags=["Test & Authentication Demo"])

# Create database tables
Base.metadata.create_all(bind=engine)

@app.get("/")
async def root():
    return {
        "message": "Menurithm API - Advanced Restaurant Inventory Management with Enhanced Security",
        "features": [
            "🤖 AI-powered demand prediction",
            "🎤 Voice inventory updates",  
            "🔗 Supplier integration (RouteCast)",
            "📊 Real-time analytics and optimization",
            "🛒 Smart reorder recommendations",
            "🔐 Role-based access control",
            "🛡️ Firebase authentication",
            "⚡ Rate limiting & security headers"
        ],
        "version": "2.1.0",
        "security": {
            "authentication": "Firebase JWT",
            "authorization": "Role-based (user/manager/admin)",
            "rate_limiting": f"{auth_config.rate_limit_calls} requests per {auth_config.rate_limit_period}s"
        },
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc", 
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "version": "2.1.0",
        "timestamp": "2025-07-26",
        "security": "enhanced"
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)