from pydantic import BaseModel
from typing import List, Optional

class DishIngredientOut(BaseModel):
    ingredient_id: int
    ingredient_name: Optional[str]  # for display
    quantity: float
    unit: str

    class Config:
        orm_mode = True

class DishOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    ingredients: List[DishIngredientOut]

    class Config:
        orm_mode = True

class DishIngredientIn(BaseModel):
    ingredient_id: int
    quantity: float
    unit: str

class DishIn(BaseModel):
    name: str
    description: Optional[str]
    ingredients: List[DishIngredientIn]

