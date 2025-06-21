from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from app.db.database import SessionLocal
from app.models.inventory import InventoryItem
from datetime import datetime
from sqlalchemy.orm import Session
from app.schemas.inventory import InventoryItemOut, InventoryItemIn
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
            name = row['ingredient_name'].strip().lower()

            existing = db.query(InventoryItem).filter(
                InventoryItem.ingredient_name.ilike(name)
            ).first()

            if existing:
                # Update existing record instead of adding duplicate
                existing.quantity = row['quantity']
                existing.unit = row['unit']
                existing.category = row['category']
                existing.expiry_date = datetime.strptime(row['expiry_date'], '%Y-%m-%d').date()
                existing.storage_location = row['storage_location']
            else:
                item = InventoryItem(
                    ingredient_name=name,
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

@router.delete("/inventory/{ingredient_name}", status_code=204)
def delete_ingredient(ingredient_name: str, db: Session = Depends(get_db)):
    item = db.query(InventoryItem).filter(
        InventoryItem.ingredient_name.ilike(ingredient_name.strip().lower())
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    db.delete(item)
    db.commit()
    return


@router.post("/inventory", status_code=201)
def add_inventory_item(item_in: InventoryItemIn, db: Session = Depends(get_db)):
    name = item_in.ingredient_name.strip().lower()

    existing = db.query(InventoryItem).filter(
        InventoryItem.ingredient_name.ilike(name)
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Ingredient already exists")

    item = InventoryItem(
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
    db: Session = Depends(get_db)
):
    item = db.query(InventoryItem).filter(
        InventoryItem.ingredient_name.ilike(ingredient_name.strip().lower())
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Ingredient not found")

    for field, value in updated.dict().items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item
