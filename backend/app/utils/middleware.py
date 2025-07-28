"""
Authentication Middleware for Menurithm APIs
Handles authentication, logging, and security headers
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import time
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user import User

logger = logging.getLogger(__name__)

class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle authentication, logging, and security
    """
    
    def __init__(self, app, exclude_paths: list = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or [
            "/docs", "/redoc", "/openapi.json", "/health", 
            "/", "/favicon.ico", "/static"
        ]
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Add security headers
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Process time header
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        # Log request
        self._log_request(request, response, process_time)
        
        return response
    
    def _log_request(self, request: Request, response: Response, process_time: float):
        """Log request details"""
        logger.info(
            f"{request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Time: {process_time:.4f}s - "
            f"Client: {request.client.host if request.client else 'unknown'}"
        )

class UserActivityMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track user activity and update last login
    """
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Update user activity if authenticated
        if hasattr(request.state, "user") and request.state.user:
            self._update_user_activity(request.state.user)
        
        return response
    
    def _update_user_activity(self, user_id: str):
        """Update user's last login time"""
        try:
            db = SessionLocal()
            user = db.query(User).filter(User.firebase_uid == user_id).first()
            if user:
                user.last_login = datetime.now()
                user.login_count += 1
                db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Failed to update user activity: {str(e)}")

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple rate limiting middleware
    """
    
    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.clients = {}
    
    async def dispatch(self, request: Request, call_next):
        client_ip = self._get_client_ip(request)
        
        if self._is_rate_limited(client_ip):
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded"}
            )
        
        return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def _is_rate_limited(self, client_ip: str) -> bool:
        """Check if client is rate limited"""
        now = time.time()
        
        if client_ip not in self.clients:
            self.clients[client_ip] = []
        
        # Clean old requests
        self.clients[client_ip] = [
            req_time for req_time in self.clients[client_ip]
            if now - req_time < self.period
        ]
        
        if len(self.clients[client_ip]) >= self.calls:
            return True
        
        self.clients[client_ip].append(now)
        return False
