"""
Authentication Configuration for Menurithm APIs
Central configuration for authentication settings
"""

import os
from typing import List, Dict, Any
from pydantic import BaseModel
from enum import Enum

class AuthConfig(BaseModel):
    """Authentication configuration settings"""
    
    # Firebase settings
    firebase_project_id: str = os.getenv("FIREBASE_PROJECT_ID", "menurithm")
    firebase_credentials_path: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    
    # JWT settings
    jwt_algorithm: str = "RS256"
    jwt_audience: str = os.getenv("JWT_AUDIENCE", "menurithm")
    
    # Rate limiting
    rate_limit_calls: int = int(os.getenv("RATE_LIMIT_CALLS", "100"))
    rate_limit_period: int = int(os.getenv("RATE_LIMIT_PERIOD", "60"))
    
    # API Keys (for service-to-service communication)
    api_keys: List[str] = os.getenv("VALID_API_KEYS", "").split(",")
    
    # Security settings
    require_https: bool = os.getenv("REQUIRE_HTTPS", "false").lower() == "true"
    cors_origins: List[str] = os.getenv("CORS_ORIGINS", "*").split(",")
    
    # Session settings
    session_timeout_minutes: int = int(os.getenv("SESSION_TIMEOUT", "60"))
    
    # Logging
    log_authentication: bool = os.getenv("LOG_AUTH", "true").lower() == "true"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

class SecurityPolicy(BaseModel):
    """Security policy configuration"""
    
    # Password requirements (for future local auth)
    min_password_length: int = 8
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_numbers: bool = True
    require_special_chars: bool = True
    
    # Account security
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 30
    
    # Token settings
    token_expiry_hours: int = 24
    refresh_token_expiry_days: int = 30
    
    # MFA settings
    enable_mfa: bool = False
    mfa_methods: List[str] = ["totp", "sms"]

# Route-specific security configurations
ROUTE_SECURITY_CONFIG: Dict[str, Dict[str, Any]] = {
    # Public routes (no auth required)
    "public": {
        "paths": ["/", "/health", "/docs", "/redoc", "/openapi.json"],
        "auth_required": False,
        "rate_limit": {"calls": 1000, "period": 60}
    },
    
    # User routes (basic auth required)
    "user": {
        "paths": ["/inventory", "/dishes", "/sales/read"],
        "auth_required": True,
        "min_role": "user",
        "rate_limit": {"calls": 100, "period": 60}
    },
    
    # Manager routes (elevated permissions)
    "manager": {
        "paths": ["/sales/write", "/inventory/bulk", "/analytics"],
        "auth_required": True,
        "min_role": "manager",
        "rate_limit": {"calls": 200, "period": 60}
    },
    
    # Admin routes (full access)
    "admin": {
        "paths": ["/users", "/settings", "/admin"],
        "auth_required": True,
        "min_role": "admin",
        "rate_limit": {"calls": 500, "period": 60}
    },
    
    # AI/ML routes (special handling)
    "ai": {
        "paths": ["/voice-commands", "/demand-predictions", "/optimization"],
        "auth_required": True,
        "min_role": "user",
        "rate_limit": {"calls": 50, "period": 60},  # Lower limit for AI endpoints
        "special_permissions": ["ai_access"]
    }
}

# Role hierarchy (higher roles inherit lower role permissions)
ROLE_HIERARCHY = {
    "viewer": 1,
    "user": 2,
    "manager": 3,
    "admin": 4
}

# Permission matrix
PERMISSION_MATRIX = {
    "viewer": ["read"],
    "user": ["read", "write_own"],
    "manager": ["read", "write", "delete_own", "manage_team"],
    "admin": ["read", "write", "delete", "admin", "manage_all"]
}

# Default settings
DEFAULT_AUTH_CONFIG = AuthConfig()
DEFAULT_SECURITY_POLICY = SecurityPolicy()

def get_auth_config() -> AuthConfig:
    """Get authentication configuration"""
    return DEFAULT_AUTH_CONFIG

def get_security_policy() -> SecurityPolicy:
    """Get security policy configuration"""
    return DEFAULT_SECURITY_POLICY

def get_route_config(path: str) -> Dict[str, Any]:
    """Get security configuration for a specific route"""
    for config_name, config in ROUTE_SECURITY_CONFIG.items():
        for route_path in config["paths"]:
            if path.startswith(route_path):
                return config
    
    # Default to user-level security
    return ROUTE_SECURITY_CONFIG["user"]

def check_role_permission(user_role: str, required_role: str) -> bool:
    """Check if user role has sufficient permissions"""
    user_level = ROLE_HIERARCHY.get(user_role, 0)
    required_level = ROLE_HIERARCHY.get(required_role, 999)
    return user_level >= required_level
