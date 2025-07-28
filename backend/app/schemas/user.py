from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    """User roles for the application"""
    VIEWER = "viewer"
    USER = "user" 
    MANAGER = "manager"
    ADMIN = "admin"

# Pydantic schemas
class UserCreate(BaseModel):
    full_name: str = Field(alias="fullName")
    organization: Optional[str] = Field(default=None)
    title: Optional[str] = Field(default=None)
    country: Optional[str] = Field(default=None)
    use_case: Optional[str] = Field(default=None, alias="useCase")
    linkedin: Optional[str] = Field(default=None)
    email: EmailStr
    firebase_uid: str
    role: UserRole = Field(default=UserRole.USER)

    model_config = {
        "populate_by_name": True  # So backend can still refer to full_name
    }

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, alias="fullName")
    organization: Optional[str] = Field(default=None)
    title: Optional[str] = Field(default=None)
    country: Optional[str] = Field(default=None)
    use_case: Optional[str] = Field(default=None, alias="useCase")
    linkedin: Optional[str] = Field(default=None)
    
    model_config = {
        "populate_by_name": True
    }

class UserOut(BaseModel):
    """User response schema with security fields"""
    id: int
    firebase_uid: str
    email: str
    full_name: str
    organization: Optional[str]
    title: Optional[str]
    country: Optional[str]
    use_case: Optional[str]
    linkedin: Optional[str]
    role: str
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime]
    login_count: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {
        "from_attributes": True
    }

class UserResponse(BaseModel):
    """Legacy user response schema for backwards compatibility"""
    id: int
    firebase_uid: str
    email: str
    full_name: str
    organization: Optional[str]
    title: Optional[str]
    country: Optional[str]
    use_case: Optional[str]
    linkedin: Optional[str]

    model_config = {
        "from_attributes": True
    }

class UserSummary(BaseModel):
    """Minimal user information for listings"""
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    last_login: Optional[datetime]
    
    model_config = {
        "from_attributes": True
    }

class UserStats(BaseModel):
    """User statistics for admin dashboard"""
    total_users: int
    active_users: int
    new_users_this_month: int
    users_by_role: dict
    recent_logins: int
