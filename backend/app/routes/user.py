from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.database import get_db
from app.models.user import User  # Adjust path if needed
from pydantic import BaseModel
from typing import List, Optional
from app.schemas.user import UserCreate, UserResponse
from app.utils.auth_dependency import verify_firebase_token


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


router = APIRouter()

# Create a user
@router.post("/users", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    firebase_user: dict = Depends(verify_firebase_token)  # 👈 Firebase user injected here
):
    firebase_uid = firebase_user["uid"]
    print("User....", user)
    existing = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = User(
        firebase_uid=firebase_uid,
        email=user.email,
        full_name=user.full_name,
        organization=user.organization,
        title=user.title,
        country=user.country,
        use_case=user.use_case,
        linkedin=user.linkedin
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# Get a user by ID
@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Get all users
@router.get("/", response_model=List[UserResponse])
def list_users(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    return db.query(User).offset(skip).limit(limit).all()

# Delete a user
@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": f"User {user_id} deleted"}





