from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.services.menu_engine import generate_menu_smart

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/generate-menu-smart")
def get_generated_menu_smart(db: Session = Depends(get_db)):
    return {"dishes": generate_menu_smart(db)}

