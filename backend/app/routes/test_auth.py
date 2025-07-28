"""
Test routes for non-user API access
Demonstrates API key authentication and public endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from app.utils.auth_enhanced import verify_api_key, flexible_auth
from typing import Dict, Any
import datetime

router = APIRouter(prefix="/test", tags=["Test & Demo"])

@router.get("/public")
async def public_endpoint():
    """
    Public endpoint - no authentication required
    Perfect for health checks, basic info, etc.
    """
    return {
        "message": "This is a public endpoint",
        "access": "No authentication required",
        "timestamp": datetime.datetime.now().isoformat(),
        "examples": [
            "Health checks",
            "API documentation",
            "Basic information retrieval"
        ]
    }

@router.get("/api-key-only")
async def api_key_only_endpoint(
    valid_key: bool = Depends(verify_api_key)
):
    """
    API key only endpoint - for service-to-service communication
    Requires X-API-Key header
    """
    return {
        "message": "API key authentication successful",
        "access": "Service-to-service only",
        "timestamp": datetime.datetime.now().isoformat(),
        "use_cases": [
            "Automated systems",
            "CI/CD pipelines", 
            "Integration services",
            "Scheduled tasks"
        ]
    }

@router.get("/flexible-auth")
async def flexible_auth_endpoint(
    auth_info: Dict[str, Any] = Depends(flexible_auth)
):
    """
    Flexible authentication - accepts either Firebase token OR API key
    Useful for endpoints that need to support both user and service access
    """
    if auth_info["auth_type"] == "api_key":
        return {
            "message": "Authenticated via API key",
            "auth_type": "service",
            "user": None,
            "access_level": "service",
            "timestamp": datetime.datetime.now().isoformat()
        }
    else:
        user_email = auth_info["user"].email if auth_info["user"] else "unknown"
        return {
            "message": "Authenticated via Firebase",
            "auth_type": "user", 
            "user": user_email,
            "access_level": "user",
            "timestamp": datetime.datetime.now().isoformat()
        }

@router.post("/data-ingestion")
async def data_ingestion_endpoint(
    data: dict,
    valid_key: bool = Depends(verify_api_key)
):
    """
    Example data ingestion endpoint for automated systems
    Requires API key authentication
    """
    return {
        "message": "Data received successfully",
        "data_size": len(str(data)),
        "processed_at": datetime.datetime.now().isoformat(),
        "status": "accepted",
        "data_preview": str(data)[:100] + "..." if len(str(data)) > 100 else str(data)
    }

@router.get("/service-status")
async def service_status_endpoint(
    valid_key: bool = Depends(verify_api_key)
):
    """
    Service status endpoint for monitoring systems
    Returns detailed status information
    """
    return {
        "service": "menurithm-api",
        "status": "operational",
        "version": "2.1.0",
        "uptime": "running",
        "features": {
            "authentication": "active",
            "database": "connected", 
            "ai_services": "available",
            "rate_limiting": "active"
        },
        "timestamp": datetime.datetime.now().isoformat()
    }
