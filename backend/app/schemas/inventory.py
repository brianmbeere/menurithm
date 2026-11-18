from pydantic import BaseModel
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Optional
from pydantic import field_validator

class InventoryItemOut(BaseModel):
    id: int
    ingredient_name: str
    quantity: str
    reorder_point: str = "0"
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
    reorder_point: str = "0"
    unit: str
    category: str
    expiry_date: date
    storage_location: str
    adjustment_reason: Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, value: str) -> str:
        try:
            quantity = Decimal(value)
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ValueError("Quantity must be a decimal number.") from exc
        if not quantity.is_finite() or quantity < 0:
            raise ValueError("Quantity must be finite and cannot be negative.")
        return format(quantity.normalize(), "f") if quantity else "0"

    @field_validator("reorder_point")
    @classmethod
    def validate_reorder_point(cls, value: str) -> str:
        try:
            quantity = Decimal(value)
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ValueError("Reorder point must be a decimal number.") from exc
        if not quantity.is_finite() or quantity < 0:
            raise ValueError("Reorder point must be finite and cannot be negative.")
        return format(quantity.normalize(), "f") if quantity else "0"
