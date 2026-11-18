import logging
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from io import StringIO
import csv
from datetime import datetime
import hashlib
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.sales import Sale
from app.models.dish import Dish
from app.schemas.sales import SalesRecordOut, SalesRecordIn
from typing import List
from sqlalchemy.orm import joinedload
from app.utils.auth import get_current_user
from app.models.user import User
from app.services.sales_processing import (
    SaleProcessingError,
    cancel_sale as cancel_sale_record,
    correct_sale,
    record_sale,
)
from fastapi import Response, Header
import math

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
    upload_hash = hashlib.sha256(contents).hexdigest()
    csv_reader = csv.DictReader(StringIO(decoded))

    logging.info(f"Processing sales upload for user {user.email}")
    print(f"🔄 Processing sales upload for user: {user.email}")
    
    # Track results
    added_sales = []
    skipped_sales = []
    errors = []
    row_count = 0

    try:
        valid_sales = []  # Collect valid sales before committing
        
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
                if quantity_sold <= 0 or not math.isfinite(price_per_unit) or price_per_unit < 0:
                    errors.append(f"Row {row_num}: Quantity must be positive and price must be finite and non-negative")
                    continue

                # Collect valid sale data
                valid_sales.append({
                    "row_num": row_num,
                    "dish": dish,
                    "dish_name": dish_name,
                    "timestamp": timestamp,
                    "quantity_sold": quantity_sold,
                    "price_per_unit": price_per_unit
                })
                
            except Exception as e:
                error_msg = f"Row {row_num}: Unexpected error - {str(e)}"
                errors.append(error_msg)
                logging.error(error_msg)
        
        if errors:
            raise HTTPException(status_code=400, detail={
                "message": "Some rows had errors",
                "errors": errors,
                "skipped_sales": skipped_sales
            })

        for sale_data in valid_sales:
            sale, duplicate = record_sale(
                db,
                user_id=user.email,
                dish_name=sale_data["dish_name"],
                timestamp=sale_data["timestamp"],
                quantity_sold=sale_data["quantity_sold"],
                price_per_unit=sale_data["price_per_unit"],
                csv_upload_hash=upload_hash,
                csv_row_number=sale_data["row_num"],
            )
            if duplicate:
                skipped_sales.append(
                    f"Row {sale_data['row_num']}: Duplicate upload; sale #{sale.id} already recorded"
                )
                continue

            added_sales.append({
                "row": sale_data["row_num"],
                "id": sale.id,
                "dish_name": sale_data["dish_name"],
                "dish_id": sale.dish_id,
                "date": sale.timestamp.strftime("%Y-%m-%d"),
                "quantity_sold": sale.quantity_sold,
                "price_per_unit": sale.price_per_unit,
                "processing_status": sale.processing_status,
                "processing_error": sale.processing_error,
            })
        
        db.commit()
        
        # Prepare detailed response
        result = {
            "status": "success" if added_sales else "partial_success",
            "summary": {
                "total_rows_processed": row_count,
                "sales_added": len(added_sales),
                "sales_skipped": len(skipped_sales),
                "duplicates_skipped": sum("Duplicate upload" in item for item in skipped_sales),
                "errors": len(errors)
            },
            "details": {
                "added_sales": added_sales,
                "skipped": skipped_sales,
                "errors": errors
            },
            "message": f"Successfully added {len(added_sales)} sales, skipped {len(skipped_sales)} with missing dishes"
        }
        
        logging.info(f"Sales upload completed: {result['summary']}")
        print(f"✅ Sales upload successful: {len(added_sales)} sales added for user {user.email}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        error_msg = f"Fatal error during sales upload: {str(e)}"
        logging.error(error_msg)
        print(f"❌ Sales upload failed: {error_msg}")
        raise HTTPException(status_code=500, detail={
            "message": error_msg,
            "errors": errors,
            "details": {"errors": errors}
        })

@router.get("/sales", response_model=List[SalesRecordOut])
def get_sales(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    print(f"📥 Fetching sales for user: {user.email}")
    
    # Filter out sales with NULL dish_id to prevent validation errors
    sales = db.query(Sale).filter(
        Sale.user_id == user.email,
        Sale.dish_id.isnot(None)
    ).options(joinedload(Sale.dish)).all()
    
    print(f"📊 Found {len(sales)} sales for user {user.email}")
    
    # Additional safety check - filter out any sales with NULL dish relationships
    valid_sales = [sale for sale in sales if sale.dish is not None]
    
    print(f"✅ Returning {len(valid_sales)} valid sales")
    return valid_sales

@router.post("/sales", status_code=201, response_model=SalesRecordOut)
def add_sale(
    sale: SalesRecordIn,
    response: Response,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=128),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    try:
        record, duplicate = record_sale(
            db,
            user_id=user.email,
            dish_name=sale.dish_name,
            timestamp=sale.timestamp,
            quantity_sold=sale.quantity_sold,
            price_per_unit=sale.price_per_unit,
            idempotency_key=idempotency_key,
        )
        db.commit()
        db.refresh(record)
        if duplicate:
            response.status_code = 200
        return record
    except SaleProcessingError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.put("/sales/{sale_id}", response_model=SalesRecordOut)
def update_sale(
    sale_id: int,
    updated: SalesRecordIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.user_id == user.email,
    ).with_for_update().first()
    if sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")
    try:
        sale = correct_sale(
            db,
            sale=sale,
            dish_name=updated.dish_name,
            timestamp=updated.timestamp,
            quantity_sold=updated.quantity_sold,
            price_per_unit=updated.price_per_unit,
        )
        db.commit()
        db.refresh(sale)
        return sale
    except SaleProcessingError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc

@router.delete("/sales/{sale_id}", status_code=204)
def delete_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.user_id == user.email,
    ).with_for_update().first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    try:
        cancel_sale_record(db, sale)
        db.commit()
    except SaleProcessingError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return
