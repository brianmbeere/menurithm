from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from app.db.database import SessionLocal
from app.models.inventory import InventoryItem
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from app.schemas.inventory import InventoryItemOut, InventoryItemIn
from app.utils.auth import get_current_user
from app.models.user import User
from typing import List
import csv
from io import StringIO
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/upload-inventory")
async def upload_inventory(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    contents = await file.read()
    decoded = contents.decode('utf-8')
    csv_reader = csv.DictReader(StringIO(decoded))
    db = SessionLocal()

    logger.info(f"Processing inventory upload for user {user.email}")
    processed_items = []
    errors = []

    try:
        for row_num, row in enumerate(csv_reader, 1):
            try:
                name = row['ingredient_name'].strip().lower()

                existing = db.query(InventoryItem).filter(
                    InventoryItem.ingredient_name.ilike(name),
                    InventoryItem.user_id == user.email
                ).first()

                if existing:
                    # Update existing record instead of adding duplicate
                    existing.quantity = row['quantity']
                    existing.unit = row['unit']
                    existing.category = row['category']
                    existing.expiry_date = datetime.strptime(row['expiry_date'], '%Y-%m-%d').date()
                    existing.storage_location = row['storage_location']
                    processed_items.append(f"Updated: {name}")
                else:
                    item = InventoryItem(
                        user_id=user.email,
                        ingredient_name=name,
                        quantity=row['quantity'],
                        unit=row['unit'],
                        category=row['category'],
                        expiry_date=datetime.strptime(row['expiry_date'], '%Y-%m-%d').date(),
                        storage_location=row['storage_location']
                    )
                    db.add(item)
                    processed_items.append(f"Added: {name}")
                    
            except (ValueError, KeyError) as e:
                error_msg = f"Row {row_num}: Invalid data - {str(e)}"
                errors.append(error_msg)
                logger.warning(error_msg)
                continue

        db.commit()
        
        result = {
            "status": "success",
            "processed_count": len(processed_items),
            "processed_items": processed_items
        }
        
        if errors:
            result["warnings"] = errors
            result["status"] = "partial_success"
            
        logger.info(f"Inventory upload completed for user {user.email}: {len(processed_items)} items processed, {len(errors)} errors")
        return result
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database integrity error during inventory upload: {str(e)}")
        raise HTTPException(status_code=400, detail="Database constraint violation. Please check for duplicate entries.")
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during inventory upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    finally:
        db.close()

@router.get("/inventory", response_model=List[InventoryItemOut])
def get_inventory(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(InventoryItem).filter(InventoryItem.user_id == user.email).all()

@router.delete("/inventory/{ingredient_name}", status_code=204)
def delete_ingredient(ingredient_name: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(InventoryItem).filter(
        InventoryItem.ingredient_name.ilike(ingredient_name.strip().lower()),
        InventoryItem.user_id == user.email
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    db.delete(item)
    db.commit()
    return


@router.post("/inventory", status_code=201)
def add_inventory_item(item_in: InventoryItemIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    name = item_in.ingredient_name.strip().lower()

    existing = db.query(InventoryItem).filter(
        InventoryItem.ingredient_name.ilike(name),
        InventoryItem.user_id == user.email
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Ingredient already exists")

    item = InventoryItem(
        user_id=user.email,
        ingredient_name=name,
        quantity=item_in.quantity,
        unit=item_in.unit,
        category=item_in.category,
        expiry_date=item_in.expiry_date,
        storage_location=item_in.storage_location
    )

    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/inventory/{ingredient_name}")
def update_inventory_item(
    ingredient_name: str,
    updated: InventoryItemIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    item = db.query(InventoryItem).filter(
        InventoryItem.ingredient_name.ilike(ingredient_name.strip().lower()),
        InventoryItem.user_id == user.email
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    for field, value in updated.dict().items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item

@router.get("/inventory/summary")
def get_inventory_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    results = (
        db.query(InventoryItem.category, func.count(InventoryItem.id))
        .filter(InventoryItem.user_id == user.email)
        .group_by(InventoryItem.category)
        .all()
    )
    return [{"name": category or "Uncategorized", "value": count} for category, count in results]
