from pydantic import BaseModel
from typing import List, Optional

class DishIngredientOut(BaseModel):
    ingredient_id: int
    ingredient_name: Optional[str]  # for display
    quantity: float
    unit: str

    model_config = {
        "from_attributes": True
    }

class DishOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    ingredients: List[DishIngredientOut]

    model_config = {
        "from_attributes": True
    }

class DishIngredientIn(BaseModel):
    ingredient_id: int
    quantity: float
    unit: str

class DishIn(BaseModel):
    name: str
    description: Optional[str]
    ingredients: List[DishIngredientIn]

class DishServiceIn(BaseModel):
    """Service-to-service dish creation schema"""
    name: str
    description: Optional[str]
    ingredients: List[DishIngredientIn]
    user_email: Optional[str] = None  # Optional target user

class DishBatchServiceIn(BaseModel):
    """Service-to-service batch dish creation schema"""
    dishes: List[DishIn]
    user_email: Optional[str] = None  # Optional target user for all dishes

