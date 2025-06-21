from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.dish import Dish, DishIngredient
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
        dish.ingredients.append(DishIngredient(
            ingredient_name=ing.ingredient_name,
            quantity=ing.quantity,
            unit=ing.unit,
        ))

    db.add(dish)
    db.commit()
    db.refresh(dish)
    return dish

@router.get("/dishes", response_model=List[DishOut])
def get_dishes(db: Session = Depends(get_db)):
    return db.query(Dish).all()

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

    # Update name and description
    dish.name = dish_data.name
    dish.description = dish_data.description

    # Clear old ingredients and add new ones
    dish.ingredients.clear()
    for ing in dish_data.ingredients:
        dish.ingredients.append(DishIngredient(
            ingredient_name=ing.ingredient_name,
            quantity=ing.quantity,
            unit=ing.unit
        ))

    db.commit()
    db.refresh(dish)
    return dish
