from pydantic import BaseModel
from datetime import date

class SalesRecordOut(BaseModel):
    id: int
    date: date
    dish_name: str
    quantity_sold: int
    price_per_unit: float

    class Config:
        orm_mode = True

class SalesRecordIn(BaseModel):
    date: date
    dish_name: str
    quantity_sold: int
    price_per_unit: float