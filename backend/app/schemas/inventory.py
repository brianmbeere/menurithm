from pydantic import BaseModel
from datetime import date

class InventoryItemOut(BaseModel):
    id: int
    ingredient_name: str
    quantity: str
    unit: str
    category: str
    expiry_date: date
    storage_location: str

    model_config = {
        "from_attributes": True
    }

class InventoryItemIn(BaseModel):
    ingredient_name: str
    quantity: str
    unit: str
    category: str
    expiry_date: date
    storage_location: str
