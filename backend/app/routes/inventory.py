from fastapi import APIRouter, File, UploadFile, Depends
from app.db.database import SessionLocal
from app.models.inventory import InventoryItem
from datetime import datetime
from sqlalchemy.orm import Session
from app.schemas.inventory import InventoryItemOut
from typing import List
import csv
from io import StringIO

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/upload-inventory")
async def upload_inventory(file: UploadFile = File(...)):
    contents = await file.read()
    decoded = contents.decode('utf-8')
    csv_reader = csv.DictReader(StringIO(decoded))
    db = SessionLocal()

    try:
        for row in csv_reader:
            item = InventoryItem(
                ingredient_name=row['ingredient_name'],
                quantity=row['quantity'],
                unit=row['unit'],
                category=row['category'],
                expiry_date=datetime.strptime(row['expiry_date'], '%Y-%m-%d').date(),
                storage_location=row['storage_location']
            )
            db.add(item)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

@router.get("/inventory", response_model=List[InventoryItemOut])
def get_inventory(db: Session = Depends(get_db)):
    return db.query(InventoryItem).all()

