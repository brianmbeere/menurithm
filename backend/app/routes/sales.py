import logging
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from io import StringIO
import csv
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.sales import Sale
from app.models.dish import Dish
from app.schemas.sales import SalesRecordOut, SalesRecordIn
from typing import List
from sqlalchemy.orm import joinedload

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/upload-sales")
async def upload_sales(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    decoded = contents.decode('utf-8')
    csv_reader = csv.DictReader(StringIO(decoded))

    added_sales = []
    try:
        for row in csv_reader:
            dish = db.query(Dish).filter(Dish.name == row["dish_name"]).first()
            if not dish:
                continue
            sale = Sale(
                dish_id=dish.id,
                timestamp=datetime.strptime(row["date"], "%Y-%m-%d"),
                quantity_sold=int(row["quantity_sold"]),
                price_per_unit=float(row["price_per_unit"])
            )
            db.add(sale)
            db.flush()  # Get sale.id before commit
            added_sales.append({
                "id": sale.id,
                "dish_id": sale.dish_id,
                "timestamp": sale.timestamp.isoformat(),
                "quantity_sold": sale.quantity_sold,
                "price_per_unit": sale.price_per_unit
            })
        db.commit()
        return {"status": "success", "added_sales": added_sales}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@router.get("/sales", response_model=List[SalesRecordOut])
def get_sales(db: Session = Depends(get_db)):
    return db.query(Sale).options(joinedload(Sale.dish)).all()

@router.post("/sales", status_code=201)
def add_sale(sale: SalesRecordIn, db: Session = Depends(get_db)):
    dish = db.query(Dish).filter(Dish.name == sale.dish_name).first()
    if not dish:
        return {"error": "Dish not found"}

    record = Sale(
        dish_id=dish.id,
        timestamp=sale.timestamp,
        quantity_sold=sale.quantity_sold,
        price_per_unit=sale.price_per_unit
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.delete("/sales/{sale_id}", status_code=204)
def delete_sale(sale_id: int, db: Session = Depends(get_db)):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    db.delete(sale)
    db.commit()
    return
