"""
Example implementation of protected routes with enhanced authentication
Demonstrates different security levels and best practices
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.utils.auth_enhanced import (
    get_current_user, 
    get_current_admin,
    get_current_manager_or_admin,
    get_user_with_write_access,
    require_role, 
    require_permission,
    UserRole,
    PermissionLevel,
    flexible_auth
)
from app.models.user import User
from app.db.database import get_db
from app.schemas.user import UserOut, UserUpdate

router = APIRouter(prefix="/auth", tags=["Authentication Examples"])

# ==================== PUBLIC ROUTES ====================

@router.get("/public/health")
async def public_health_check():
    """Public endpoint - no authentication required"""
    return {"status": "healthy", "timestamp": datetime.now()}

# ==================== USER LEVEL ROUTES ====================

@router.get("/profile", response_model=UserOut)
async def get_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user's profile - requires basic authentication"""
    return current_user

@router.put("/profile")
async def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_user_with_write_access),
    db: Session = Depends(get_db)
):
    """Update user profile - requires write permissions"""
    
    # Update user fields
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    current_user.updated_at = datetime.now()
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Profile updated successfully", "user": current_user}

# ==================== MANAGER LEVEL ROUTES ====================

@router.get("/users", response_model=List[UserOut])
async def list_users(
    current_user: User = Depends(get_current_manager_or_admin),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """List all users - requires manager or admin role"""
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    new_role: UserRole,
    current_user: User = Depends(get_current_manager_or_admin),
    db: Session = Depends(get_db)
):
    """Update user role - requires manager or admin permissions"""
    
    # Managers can only assign roles up to their level
    if current_user.role == UserRole.MANAGER and new_role == UserRole.ADMIN:
        raise HTTPException(
            status_code=403, 
            detail="Managers cannot assign admin role"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = new_role.value
    user.updated_at = datetime.now()
    db.commit()
    
    return {"message": f"User role updated to {new_role.value}"}

# ==================== ADMIN LEVEL ROUTES ====================

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete user - requires admin role"""
    
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}

@router.post("/admin/system-settings")
async def update_system_settings(
    settings: dict,
    current_user: User = Depends(get_current_admin)
):
    """Update system settings - admin only"""
    # Implementation would update system configuration
    return {"message": "System settings updated", "settings": settings}

# ==================== DECORATOR EXAMPLES ====================

@router.get("/manager-only")
@require_role([UserRole.MANAGER, UserRole.ADMIN])
async def manager_only_endpoint(current_user: User = Depends(get_current_user)):
    """Example using role decorator"""
    return {"message": "This endpoint requires manager or admin role"}

@router.post("/write-operation")
@require_permission(PermissionLevel.WRITE)
async def write_operation_endpoint(current_user: User = Depends(get_current_user)):
    """Example using permission decorator"""
    return {"message": "This endpoint requires write permission"}

# ==================== FLEXIBLE AUTH EXAMPLE ====================

@router.get("/flexible-auth")
async def flexible_auth_endpoint(
    auth_info: dict = Depends(flexible_auth)
):
    """Example endpoint that accepts either Firebase token or API key"""
    
    if auth_info["auth_type"] == "api_key":
        return {"message": "Authenticated via API key", "user": None}
    else:
        return {
            "message": "Authenticated via Firebase", 
            "user": auth_info["user"].email if auth_info["user"] else None
        }

# ==================== RATE LIMITED EXAMPLE ====================

@router.get("/rate-limited")
async def rate_limited_endpoint(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Example endpoint with automatic rate limiting"""
    # Rate limiting is handled in the get_current_user dependency
    return {
        "message": "This endpoint is rate limited",
        "user": current_user.email,
        "client_ip": request.client.host if request.client else "unknown"
    }

# ==================== AUDIT LOG EXAMPLE ====================

@router.post("/sensitive-operation")
async def sensitive_operation(
    operation_data: dict,
    current_user: User = Depends(get_current_admin),
    request: Request = None
):
    """Example of operation that should be logged for audit"""
    
    # Log sensitive operation
    import logging
    logger = logging.getLogger(__name__)
    logger.info(
        f"Sensitive operation performed by {current_user.email} "
        f"from IP {request.client.host if request and request.client else 'unknown'}: "
        f"{operation_data}"
    )
    
    # Perform the operation
    return {"message": "Sensitive operation completed", "logged": True}
