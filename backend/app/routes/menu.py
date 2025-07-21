from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.services.menu_engine import generate_menu_smart
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/generate-menu-smart")
def get_generated_menu_smart(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)  # ✅ Inject current user
):
    return {"dishes": generate_menu_smart(db, user.email)}  # ✅ Pass user ID to service
