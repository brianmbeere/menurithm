"""
Enhanced Authentication System for Menurithm APIs
Provides role-based access control, rate limiting, and comprehensive security
"""

import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, List
from functools import wraps
from datetime import datetime, timedelta
import os
import logging
from enum import Enum
from dotenv import load_dotenv

from app.db.database import SessionLocal
from app.models.user import User

# Load environment variables
load_dotenv()

# Setup logging
logger = logging.getLogger(__name__)

# Initialize Firebase only if not already initialized
if not firebase_admin._apps:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    path_to_json = os.path.join(BASE_DIR, "../core/menurithm-firebase-adminsdk-fbsvc-36044de71d.json")
    
    if os.path.exists(path_to_json):
        cred = credentials.Certificate(path_to_json)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase initialized successfully")
    else:
        logger.warning(f"Firebase credentials file not found at {path_to_json}")

class UserRole(str, Enum):
    """User roles for role-based access control"""
    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"
    VIEWER = "viewer"

class PermissionLevel(str, Enum):
    """Permission levels for granular access control"""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"

# Security scheme for OpenAPI docs
security = HTTPBearer()

def get_db():
    """Database dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class AuthenticationError(HTTPException):
    """Custom authentication error"""
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(status_code=401, detail=detail)

class PermissionError(HTTPException):
    """Custom permission error"""
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(status_code=403, detail=detail)

class RateLimitError(HTTPException):
    """Custom rate limit error"""
    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(status_code=429, detail=detail)

# In-memory rate limiting (use Redis in production)
rate_limit_storage = {}

def check_rate_limit(user_id: str, limit: int = 100, window_minutes: int = 60):
    """Simple rate limiting implementation"""
    now = datetime.now()
    window_start = now - timedelta(minutes=window_minutes)
    
    if user_id not in rate_limit_storage:
        rate_limit_storage[user_id] = []
    
    # Clean old requests
    rate_limit_storage[user_id] = [
        req_time for req_time in rate_limit_storage[user_id] 
        if req_time > window_start
    ]
    
    if len(rate_limit_storage[user_id]) >= limit:
        raise RateLimitError(f"Rate limit exceeded: {limit} requests per {window_minutes} minutes")
    
    rate_limit_storage[user_id].append(now)

async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Verify Firebase ID token and return decoded token
    """
    try:
        # Verify the token
        decoded_token = auth.verify_id_token(credentials.credentials)
        return decoded_token
    except auth.ExpiredIdTokenError:
        raise AuthenticationError("Token has expired")
    except auth.RevokedIdTokenError:
        raise AuthenticationError("Token has been revoked")
    except auth.InvalidIdTokenError:
        raise AuthenticationError("Invalid token")
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        raise AuthenticationError("Token verification failed")

async def get_current_user(
    token_data: dict = Depends(verify_firebase_token),
    db: Session = Depends(get_db),
    request: Request = None
) -> User:
    """
    Get current authenticated user with enhanced features
    """
    firebase_uid = token_data.get("uid")
    email = token_data.get("email")
    
    if not firebase_uid:
        raise AuthenticationError("Invalid token: missing user ID")
    
    # Rate limiting
    if request:
        check_rate_limit(firebase_uid)
    
    # Get or create user
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    
    if not user:
        # Auto-create user on first login
        user = User(
            firebase_uid=firebase_uid,
            email=email,
            full_name=token_data.get("name", ""),
            # Default role for new users
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"Created new user: {email}")
    
    return user

def require_role(allowed_roles: List[UserRole]):
    """
    Decorator to require specific user roles
    Usage: @require_role([UserRole.ADMIN, UserRole.MANAGER])
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user from kwargs
            user = kwargs.get('current_user') or kwargs.get('user')
            if not user:
                raise AuthenticationError("User not found in request")
            
            # Check if user has required role
            user_role = getattr(user, 'role', UserRole.USER)
            if user_role not in allowed_roles:
                raise PermissionError(f"Requires one of roles: {[role.value for role in allowed_roles]}")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_permission(permission: PermissionLevel):
    """
    Decorator to require specific permissions
    Usage: @require_permission(PermissionLevel.WRITE)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user = kwargs.get('current_user') or kwargs.get('user')
            if not user:
                raise AuthenticationError("User not found in request")
            
            # Simple permission check (extend based on your needs)
            user_role = getattr(user, 'role', UserRole.USER)
            
            permission_map = {
                UserRole.VIEWER: [PermissionLevel.READ],
                UserRole.USER: [PermissionLevel.READ, PermissionLevel.WRITE],
                UserRole.MANAGER: [PermissionLevel.READ, PermissionLevel.WRITE, PermissionLevel.DELETE],
                UserRole.ADMIN: [PermissionLevel.READ, PermissionLevel.WRITE, PermissionLevel.DELETE, PermissionLevel.ADMIN]
            }
            
            allowed_permissions = permission_map.get(user_role, [])
            if permission not in allowed_permissions:
                raise PermissionError(f"Requires {permission.value} permission")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Enhanced dependency functions for different permission levels
async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require admin role"""
    if getattr(current_user, 'role', UserRole.USER) != UserRole.ADMIN:
        raise PermissionError("Admin access required")
    return current_user

async def get_current_manager_or_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require manager or admin role"""
    user_role = getattr(current_user, 'role', UserRole.USER)
    if user_role not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise PermissionError("Manager or Admin access required")
    return current_user

async def get_user_with_write_access(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require write permissions"""
    user_role = getattr(current_user, 'role', UserRole.USER)
    if user_role == UserRole.VIEWER:
        raise PermissionError("Write access required")
    return current_user

# Optional: API Key authentication for service-to-service calls
async def verify_api_key(
    x_api_key: str = Header(..., alias="X-API-Key")
) -> bool:
    """Verify API key for service authentication"""
    from app.utils.auth_config import get_auth_config
    auth_config = get_auth_config()
    valid_api_keys = auth_config.api_keys
    
    if x_api_key not in valid_api_keys:
        raise AuthenticationError("Invalid API key")
    return True

# Optional: Combined auth (Firebase OR API Key)
async def flexible_auth(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db)
) -> dict:
    """Allow either Firebase token or API key authentication"""
    
    if x_api_key:
        # API Key authentication
        await verify_api_key(x_api_key)
        return {"auth_type": "api_key", "user": None}
    
    elif authorization and authorization.startswith("Bearer "):
        # Firebase token authentication
        token = authorization.split(" ")[1]
        try:
            decoded_token = auth.verify_id_token(token)
            firebase_uid = decoded_token["uid"]
            user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
            return {"auth_type": "firebase", "user": user, "token_data": decoded_token}
        except Exception as e:
            raise AuthenticationError("Invalid Firebase token")
    
    else:
        raise AuthenticationError("No valid authentication provided")
