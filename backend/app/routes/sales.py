from fastapi import APIRouter, File, UploadFile, Depends
from io import StringIO
import csv
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.sales import SalesRecord
from app.schemas.sales import SalesRecordOut, SalesRecordIn
from typing import List


router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/upload-sales")
async def upload_inventory(file: UploadFile = File(...)):
    contents = await file.read()
    decoded = contents.decode('utf-8')
    csv_reader = csv.DictReader(StringIO(decoded))
    db = SessionLocal()

    try:
        for row in csv_reader:
            item = SalesRecord(
                    date = datetime.strptime(row['date'], '%Y-%m-%d').date(),
                    dish_name = row['dish_name'],
                    quantity_sold = row['quantity_sold'],
                    price_per_unit = row['price_per_unit'],
            )
            db.add(item)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

@router.get("/sales", response_model=List[SalesRecordOut])
def get_sales(db: Session = Depends(get_db)):
    return db.query(SalesRecord).all()

@router.post("/sales", status_code=201)
def add_sale(sale: SalesRecordIn, db: Session = Depends(get_db)):
    record = SalesRecord(**sale.dict())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record