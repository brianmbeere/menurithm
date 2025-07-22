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
        
        # Only commit valid sales in a single transaction
        for sale_data in valid_sales:
            sale = Sale(
                dish_id=sale_data["dish"].id,
                user_id=user.email,
                timestamp=sale_data["timestamp"],
                quantity_sold=sale_data["quantity_sold"],
                price_per_unit=sale_data["price_per_unit"]
            )
            db.add(sale)
            db.flush()  # Get the sale ID
            
            added_sales.append({
                "row": sale_data["row_num"],
                "id": sale.id,
                "dish_name": sale_data["dish_name"],
                "dish_id": sale.dish_id,
                "date": sale.timestamp.strftime("%Y-%m-%d"),
                "quantity_sold": sale.quantity_sold,
                "price_per_unit": sale.price_per_unit
            })
        
        # Commit all valid sales at once
        if errors:
            logging.error(f"Sales upload had errors: {errors}")
            db.rollback()
            raise HTTPException(status_code=400, detail={
                "message": "Some rows had errors", 
                "errors": errors,
                "added_sales": added_sales,
                "skipped_sales": skipped_sales
            })
        
        db.commit()
        
        # Prepare detailed response
        result = {
            "status": "success" if added_sales else "partial_success",
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
