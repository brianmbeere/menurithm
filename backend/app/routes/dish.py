from collections import defaultdict
import csv
from datetime import datetime
from io import StringIO
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.dish import Dish, DishIngredient
from app.models.inventory import InventoryItem
from app.schemas.dish import DishIn, DishOut
from app.models.user import User
from app.utils.auth import get_current_user
from typing import List

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/dishes", response_model=DishOut)
def create_dish(
    dish_in: DishIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)  # 👈 current user
):
    existing = db.query(Dish).filter(
        Dish.name == dish_in.name,
        Dish.user_id == user.email  # 👈 scoped to user
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Dish already exists")

    dish = Dish(
        name=dish_in.name,
        description=dish_in.description,
        user_id=user.email  # 👈 assign ownership
    )

    for ing in dish_in.ingredients:
        inventory_item = db.query(InventoryItem).filter(
            InventoryItem.id == ing.ingredient_id,
            InventoryItem.user_id == user.email  # 👈 validate user owns the ingredient
        ).first()
        if not inventory_item:
            raise HTTPException(status_code=400, detail=f"Ingredient with id {ing.ingredient_id} not found")

        dish.ingredients.append(DishIngredient(
            ingredient_id=ing.ingredient_id,
            quantity=ing.quantity,
            unit=ing.unit,
            user_id=user.email,
        ))

    db.add(dish)
    db.commit()
    db.refresh(dish)

    for ing in dish.ingredients:
        ing.ingredient_name = ing.ingredient.ingredient_name if ing.ingredient else None

    return dish

@router.get("/dishes", response_model=List[DishOut])
def get_dishes(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    dishes = db.query(Dish).filter(Dish.user_id == user.email).all()

    for dish in dishes:
        for ing in dish.ingredients:
            ing.ingredient_name = ing.ingredient.ingredient_name if ing.ingredient else None

    return dishes

@router.delete("/dishes/{dish_id}", status_code=204)
def delete_dish(
    dish_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    dish = db.query(Dish).filter(Dish.id == dish_id, Dish.user_id == user.email).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")

    db.delete(dish)
    db.commit()
    return

@router.put("/dishes/{dish_id}")
def update_dish(
    dish_id: int,
    dish_data: DishIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    dish = db.query(Dish).filter(Dish.id == dish_id, Dish.user_id == user.email).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")

    dish.name = dish_data.name
    dish.description = dish_data.description
    dish.ingredients.clear()

    for ing in dish_data.ingredients:
        inventory_item = db.query(InventoryItem).filter(
            InventoryItem.id == ing.ingredient_id,
            InventoryItem.user_id == user.email
        ).first()
        if not inventory_item:
            raise HTTPException(status_code=400, detail=f"Ingredient with id {ing.ingredient_id} not found")

        dish.ingredients.append(DishIngredient(
            ingredient_id=ing.ingredient_id,
            quantity=ing.quantity,
            unit=ing.unit,
        ))

    db.commit()
    db.refresh(dish)

    for ing in dish.ingredients:
        ing.ingredient_name = ing.ingredient.ingredient_name if ing.ingredient else None

    return dish

@router.post("/upload-dishes")
async def upload_dishes(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    contents = await file.read()
    decoded = contents.decode("utf-8")
    csv_reader = csv.DictReader(StringIO(decoded))
    db = SessionLocal()

    added_dishes = []
    skipped_dishes = []
    errors = []

    try:
        # Group rows by dish
        dishes = defaultdict(list)
        for row in csv_reader:
            dish_name = row["dish_name"].strip()
            dishes[dish_name].append(row)

        print(f"Processing {len(dishes)} dishes for user {user.email}")

        for dish_name, rows in dishes.items():
            try:
                description = rows[0].get("description", "").strip() or None

                # Check if dish already exists
                existing_dish = db.query(Dish).filter(
                    Dish.name.ilike(dish_name),
                    Dish.user_id == user.email
                ).first()
                if existing_dish:
                    skipped_dishes.append(f"Dish '{dish_name}' already exists")
                    continue

                new_dish = Dish(
                    name=dish_name,
                    description=description,
                    user_id=user.email,
                )
                db.add(new_dish)
                db.flush()  # Get new_dish.id

                dish_ingredients = []
                for row in rows:
                    ingredient_name = row["ingredient_name"].strip()

                    inventory_item = db.query(InventoryItem).filter(
                        InventoryItem.ingredient_name.ilike(ingredient_name),
                        InventoryItem.user_id == user.email
                    ).first()

                    if not inventory_item:
                        errors.append(f"Ingredient '{ingredient_name}' not found in inventory for dish '{dish_name}'")
                        continue
                   
                    dish_ingredient = DishIngredient(
                        dish_id=new_dish.id,
                        ingredient_id=inventory_item.id,
                        quantity=float(row["quantity"]),
                        unit=row["unit"].strip(),
                        user_id=user.email,
                    )
                    db.add(dish_ingredient)
                    dish_ingredients.append(dish_ingredient)

                if dish_ingredients:
                    added_dishes.append({
                        "name": dish_name,
                        "ingredients_count": len(dish_ingredients)
                    })
                    print(f"Added dish: {dish_name} with {len(dish_ingredients)} ingredients")
                else:
                    errors.append(f"No valid ingredients found for dish '{dish_name}', skipping")
                    db.delete(new_dish)

            except Exception as e:
                errors.append(f"Error processing dish '{dish_name}': {str(e)}")
                continue

        if errors:
            print(f"Errors encountered: {errors}")
            db.rollback()
            raise HTTPException(status_code=400, detail={"errors": errors, "added_dishes": added_dishes, "skipped_dishes": skipped_dishes})
        
        db.commit()
        print(f"Successfully added {len(added_dishes)} dishes")
        return {
            "status": "success",
            "added_dishes": added_dishes,
            "skipped_dishes": skipped_dishes,
            "summary": f"Added {len(added_dishes)} dishes, skipped {len(skipped_dishes)} duplicates"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Fatal error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    finally:
        db.close()