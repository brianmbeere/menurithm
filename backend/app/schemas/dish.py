from pydantic import BaseModel, Field
from typing import List, Optional
from decimal import Decimal

class DishIngredientOut(BaseModel):
    ingredient_id: int
    ingredient_name: Optional[str]  # for display
    quantity: float
    quantity_decimal: Optional[Decimal] = None
    unit: str

    model_config = {
        "from_attributes": True
    }

class DishOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    recipe_yield: Optional[Decimal] = None
    ingredients: List[DishIngredientOut]

    model_config = {
        "from_attributes": True
    }

class DishIngredientIn(BaseModel):
    ingredient_id: int
    quantity: Decimal = Field(gt=0, allow_inf_nan=False)
    unit: str

class DishIn(BaseModel):
    name: str
    description: Optional[str]
    ingredients: List[DishIngredientIn]
    recipe_yield: Optional[Decimal] = Field(default=None, gt=0, allow_inf_nan=False)

class DishServiceIn(BaseModel):
    """Service-to-service dish creation schema"""
    name: str
    description: Optional[str]
    ingredients: List[DishIngredientIn]
    user_email: Optional[str] = None  # Optional target user
    recipe_yield: Optional[Decimal] = Field(default=None, gt=0, allow_inf_nan=False)

class DishBatchServiceIn(BaseModel):
    """Service-to-service batch dish creation schema"""
    dishes: List[DishIn]
    user_email: Optional[str] = None  # Optional target user for all dishes
