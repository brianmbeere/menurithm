from pydantic import BaseModel
from datetime import datetime

class DishOut(BaseModel):
    id: int
    name: str

    model_config = {
        "from_attributes": True
    }

class SalesRecordIn(BaseModel):
    dish_name: str
    timestamp: datetime
    quantity_sold: int
    price_per_unit: float

class SalesRecordOut(BaseModel):
    id: int
    timestamp: datetime
    dish: DishOut
    quantity_sold: int
    price_per_unit: float

    model_config = {
        "from_attributes": True
    }
