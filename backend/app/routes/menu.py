from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.services.menu_engine import generate_menu

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/generate-menu")
def get_generated_menu(db: Session = Depends(get_db)):
    dishes = generate_menu(db)
    return {"dishes": dishes}

