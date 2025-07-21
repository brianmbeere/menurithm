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

    logging.info(f"Processing sales upload for user {user.email}")
    
    # Track results
    added_sales = []
    skipped_sales = []
    errors = []
    row_count = 0

    try:
        for row_num, row in enumerate(csv_reader, 1):
            row_count += 1
            try:
                dish_name = row["dish_name"].strip()
                
                dish = db.query(Dish).filter(
                    Dish.name == dish_name,
                    Dish.user_id == user.email
                ).first()
                
                if not dish:
                    skipped_msg = f"Row {row_num}: Dish '{dish_name}' not found"
                    skipped_sales.append(skipped_msg)
                    logging.warning(skipped_msg)
                    continue

                # Validate date format
                try:
                    timestamp = datetime.strptime(row["date"], "%Y-%m-%d")
                except ValueError as e:
                    error_msg = f"Row {row_num}: Invalid date format '{row['date']}'"
                    errors.append(error_msg)
                    continue

                # Validate numeric fields
                try:
                    quantity_sold = int(row["quantity_sold"])
                    price_per_unit = float(row["price_per_unit"])
                except ValueError as e:
                    error_msg = f"Row {row_num}: Invalid numeric data - {str(e)}"
                    errors.append(error_msg)
                    continue

                sale = Sale(
                    dish_id=dish.id,
                    user_id=user.email,
                    timestamp=timestamp,
                    quantity_sold=quantity_sold,
                    price_per_unit=price_per_unit
                )
                db.add(sale)
                db.flush()  # Get the sale ID
                
                added_sales.append({
                    "row": row_num,
                    "id": sale.id,
                    "dish_name": dish_name,
                    "dish_id": sale.dish_id,
                    "date": sale.timestamp.strftime("%Y-%m-%d"),
                    "quantity_sold": sale.quantity_sold,
                    "price_per_unit": sale.price_per_unit
                })
                
            except Exception as e:
                error_msg = f"Row {row_num}: Unexpected error - {str(e)}"
                errors.append(error_msg)
                logging.error(error_msg)
                continue

        db.commit()
        
        # Prepare detailed response
        result = {
            "status": "success" if added_sales else "partial_success" if not errors else "error",
            "summary": {
                "total_rows_processed": row_count,
                "sales_added": len(added_sales),
                "sales_skipped": len(skipped_sales),
                "errors": len(errors)
            },
            "details": {
                "added_sales": added_sales,
                "skipped": skipped_sales,
                "errors": errors
            }
        }
        
        logging.info(f"Sales upload completed: {result['summary']}")
        return result
        
    except Exception as e:
        db.rollback()
        error_msg = f"Fatal error during sales upload: {str(e)}"
        logging.error(error_msg)
        return {
            "status": "error",
            "message": error_msg,
            "details": {"errors": errors}
        }

@router.get("/sales", response_model=List[SalesRecordOut])
def get_sales(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return db.query(Sale).filter(Sale.user_id == user.email).options(joinedload(Sale.dish)).all()

@router.post("/sales", status_code=201)
def add_sale(
    sale: SalesRecordIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    dish = db.query(Dish).filter(
        Dish.name == sale.dish_name,
        Dish.user_id == user.email
    ).first()
    if not dish:
        raise HTTPException(status_code=400, detail="Dish not found")

    record = Sale(
        user_id=user.email,
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
    sale = db.query(Sale).filter(Sale.id == sale_id, Sale.user_id == user.email).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    db.delete(sale)
    db.commit()
    return
