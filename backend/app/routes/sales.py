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
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/upload-sales")
async def upload_sales(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    contents = await file.read()
    decoded = contents.decode('utf-8')
    csv_reader = csv.DictReader(StringIO(decoded))

    added_sales = []
    try:
        for row in csv_reader:
            dish = db.query(Dish).filter(
                Dish.name == row["dish_name"],
                Dish.user_id == user.id  # ✅ scope to user-owned dish
            ).first()
            if not dish:
                continue

            sale = Sale(
                dish_id=dish.id,
                user_id=user.id,  # ✅ attach sale to user
                timestamp=datetime.strptime(row["date"], "%Y-%m-%d"),
                quantity_sold=int(row["quantity_sold"]),
                price_per_unit=float(row["price_per_unit"])
            )
            db.add(sale)
            db.flush()
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
def get_sales(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return db.query(Sale).filter(Sale.user_id == user.id).options(joinedload(Sale.dish)).all()

@router.post("/sales", status_code=201)
def add_sale(
    sale: SalesRecordIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    dish = db.query(Dish).filter(
        Dish.name == sale.dish_name,
        Dish.user_id == user.id
    ).first()
    if not dish:
        raise HTTPException(status_code=400, detail="Dish not found")

    record = Sale(
        user_id=user.id,
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
def delete_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    sale = db.query(Sale).filter(Sale.id == sale_id, Sale.user_id == user.id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    db.delete(sale)
    db.commit()
    return
