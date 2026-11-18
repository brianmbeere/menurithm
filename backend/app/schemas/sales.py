from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class DishOut(BaseModel):
    id: int
    name: str

    model_config = {
        "from_attributes": True
    }

class SalesRecordIn(BaseModel):
    dish_name: str
    timestamp: datetime
    quantity_sold: int = Field(gt=0)
    price_per_unit: float = Field(ge=0, allow_inf_nan=False)

class SalesRecordOut(BaseModel):
    id: int
    timestamp: datetime
    dish: DishOut
    quantity_sold: int
    price_per_unit: float
    processing_status: str = "pending"
    processing_error: Optional[str] = None
    processed_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }


class InventoryMovementOut(BaseModel):
    id: int
    sale_id: Optional[int]
    external_reference: Optional[str] = None
    movement_type: str
    quantity_change: str
    quantity_before: str
    quantity_after: str
    unit: str
    reason: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }
