from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.dish import Dish, DishIngredient
from app.models.inventory import InventoryItem  # Import InventoryItem model
from app.schemas.dish import DishIn, DishOut
from typing import List

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/dishes", response_model=DishOut)
def create_dish(dish_in: DishIn, db: Session = Depends(get_db)):
    existing = db.query(Dish).filter(Dish.name == dish_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Dish already exists")

    dish = Dish(
        name=dish_in.name,
        description=dish_in.description,
    )

    for ing in dish_in.ingredients:
        # Validate ingredient exists
        inventory_item = db.query(InventoryItem).filter(InventoryItem.id == ing.ingredient_id).first()
        if not inventory_item:
            raise HTTPException(status_code=400, detail=f"Ingredient with id {ing.ingredient_id} not found")
        dish.ingredients.append(DishIngredient(
            ingredient_id=ing.ingredient_id,
            quantity=ing.quantity,
            unit=ing.unit,
        ))

    db.add(dish)
    db.commit()
    db.refresh(dish)
    # Attach ingredient_name for output
    for ing in dish.ingredients:
        ing.ingredient_name = ing.ingredient.ingredient_name if ing.ingredient else None
    return dish

@router.get("/dishes", response_model=List[DishOut])
def get_dishes(db: Session = Depends(get_db)):
    dishes = db.query(Dish).all()
    # Attach ingredient_name for output
    for dish in dishes:
        for ing in dish.ingredients:
            ing.ingredient_name = ing.ingredient.ingredient_name if ing.ingredient else None
    return dishes

@router.delete("/dishes/{dish_id}", status_code=204)
def delete_dish(dish_id: int, db: Session = Depends(get_db)):
    dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")

    db.delete(dish)
    db.commit()
    return

@router.put("/dishes/{dish_id}")
def update_dish(dish_id: int, dish_data: DishIn, db: Session = Depends(get_db)):
    dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")
    dish.name = dish_data.name
    dish.description = dish_data.description
    # Clear old ingredients and add new ones
    dish.ingredients.clear()
    for ing in dish_data.ingredients:
        inventory_item = db.query(InventoryItem).filter(InventoryItem.id == ing.ingredient_id).first()
        if not inventory_item:
            raise HTTPException(status_code=400, detail=f"Ingredient with id {ing.ingredient_id} not found")
        dish.ingredients.append(DishIngredient(
            ingredient_id=ing.ingredient_id,
            quantity=ing.quantity,
            unit=ing.unit
        ))
    db.commit()
    db.refresh(dish)
    # Attach ingredient_name for output
    for ing in dish.ingredients:
        ing.ingredient_name = ing.ingredient.ingredient_name if ing.ingredient else None
    return dish
