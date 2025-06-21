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
