from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from app.db.database import SessionLocal
from app.models.inventory import InventoryItem
from app.models.inventory_movement import InventoryMovement
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from app.schemas.inventory import InventoryItemOut, InventoryItemIn
from app.schemas.sales import InventoryMovementOut
from app.utils.auth import get_current_user
from app.models.user import User
from typing import List
import csv
from io import StringIO
import logging
from app.services.unit_conversion import decimal_value

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
                ).with_for_update().first()

                if existing:
                    # Update existing record instead of adding duplicate
                    new_quantity = decimal_value(row['quantity'], "Quantity")
                    if not new_quantity.is_finite() or new_quantity < 0:
                        raise ValueError("Quantity must be finite and non-negative")
                    old_quantity = decimal_value(existing.quantity, "Existing inventory quantity")
                    old_unit = existing.unit
                    if old_unit != row['unit'] and old_quantity:
                        raise ValueError(
                            f"Cannot change {name} from {old_unit} to {row['unit']} while stock is nonzero"
                        )
                    existing.quantity = row['quantity']
                    existing.unit = row['unit']
                    existing.category = row['category']
                    existing.expiry_date = datetime.strptime(row['expiry_date'], '%Y-%m-%d').date()
                    existing.storage_location = row['storage_location']
                    if old_quantity != new_quantity:
                        db.add(InventoryMovement(
                            user_id=user.email,
                            inventory_item_id=existing.id,
                            movement_type="adjustment",
                            quantity_change=format(new_quantity - old_quantity, "f"),
                            quantity_before=format(old_quantity, "f"),
                            quantity_after=format(new_quantity, "f"),
                            unit=row['unit'],
                            reason="Inventory CSV import",
                        ))
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
                    db.flush()
                    db.add(InventoryMovement(
                        user_id=user.email,
                        inventory_item_id=item.id,
                        movement_type="adjustment",
                        quantity_change=str(item.quantity),
                        quantity_before="0",
                        quantity_after=str(item.quantity),
                        unit=item.unit,
                        reason="Initial inventory CSV import",
                    ))
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

@router.get("/inventory/low-stock", response_model=List[InventoryItemOut])
def get_low_stock_inventory(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    items = db.query(InventoryItem).filter(
        InventoryItem.user_id == user.email,
    ).all()
    return [
        item for item in items
        if decimal_value(item.reorder_point, "Inventory reorder point") > 0
        and decimal_value(item.quantity, "Inventory quantity")
        <= decimal_value(item.reorder_point, "Inventory reorder point")
    ]

@router.delete("/inventory/{ingredient_name}", status_code=204)
def delete_ingredient(ingredient_name: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(InventoryItem).filter(
        InventoryItem.ingredient_name.ilike(ingredient_name.strip().lower()),
        InventoryItem.user_id == user.email
    ).with_for_update().first()

    if not item:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    # Check if this ingredient is used in any dishes
    from app.models.dish import DishIngredient
    dish_count = db.query(DishIngredient).filter(DishIngredient.ingredient_id == item.id).count()
    movement_count = db.query(InventoryMovement).filter(
        InventoryMovement.inventory_item_id == item.id
    ).count()

    if dish_count > 0 or movement_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=(
                f"Cannot delete ingredient '{item.ingredient_name}' because it is used "
                f"in {dish_count} dish(es) and has {movement_count} stock movement(s). "
                "Remove recipe references first; inventory with history must be retained."
            )
        )

    try:
        db.delete(item)
        db.commit()
        logger.info(f"Successfully deleted ingredient {item.ingredient_name} for user {user.email}")
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Integrity error deleting ingredient {item.ingredient_name}: {str(e)}")
        raise HTTPException(status_code=400, detail="Cannot delete ingredient due to database constraints")
    
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
        reorder_point=item_in.reorder_point,
        unit=item_in.unit,
        category=item_in.category,
        expiry_date=item_in.expiry_date,
        storage_location=item_in.storage_location
    )

    db.add(item)
    db.flush()
    initial_quantity = decimal_value(item.quantity, "Initial inventory quantity")
    db.add(InventoryMovement(
        user_id=user.email,
        inventory_item_id=item.id,
        movement_type="adjustment",
        quantity_change=format(initial_quantity, "f"),
        quantity_before="0",
        quantity_after=format(initial_quantity, "f"),
        unit=item.unit,
        reason="Initial inventory entry",
    ))
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
    ).with_for_update().first()

    if not item:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    old_quantity = decimal_value(item.quantity, "Existing inventory quantity")
    new_quantity = decimal_value(updated.quantity, "Updated inventory quantity")
    if item.unit != updated.unit and old_quantity:
        raise HTTPException(
            status_code=400,
            detail="Cannot change the unit while inventory stock is nonzero.",
        )
    if old_quantity != new_quantity and not (updated.adjustment_reason or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Provide an adjustment reason when changing the inventory quantity.",
        )
    for field, value in updated.model_dump(exclude={"adjustment_reason"}).items():
        setattr(item, field, value)

    if old_quantity != new_quantity:
        db.add(InventoryMovement(
            user_id=user.email,
            inventory_item_id=item.id,
            movement_type="adjustment",
            quantity_change=format(new_quantity - old_quantity, "f"),
            quantity_before=format(old_quantity, "f"),
            quantity_after=format(new_quantity, "f"),
            unit=updated.unit,
            reason=updated.adjustment_reason.strip(),
        ))
    db.commit()
    db.refresh(item)
    return item


@router.get("/inventory/{ingredient_name}/movements", response_model=List[InventoryMovementOut])
def get_inventory_movements(
    ingredient_name: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.query(InventoryItem).filter(
        InventoryItem.ingredient_name.ilike(ingredient_name.strip().lower()),
        InventoryItem.user_id == user.email,
    ).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return db.query(InventoryMovement).filter(
        InventoryMovement.inventory_item_id == item.id,
        InventoryMovement.user_id == user.email,
    ).order_by(InventoryMovement.created_at.desc(), InventoryMovement.id.desc()).all()

@router.get("/inventory/summary")
def get_inventory_summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    results = (
        db.query(InventoryItem.category, func.count(InventoryItem.id))
        .filter(InventoryItem.user_id == user.email)
        .group_by(InventoryItem.category)
        .all()
    )
    return [{"name": category or "Uncategorized", "value": count} for category, count in results]
