# Import all models to ensure proper relationship initialization
from .user import User
from .inventory import InventoryItem
from .inventory_enhanced import InventoryItemEnhanced, StockMovement, PurchaseOrder
from .dish import Dish, DishIngredient
from .sales import Sale
from .inventory_movement import InventoryMovement

# Make all models available when importing from app.models
__all__ = ["User", "InventoryItem", "InventoryItemEnhanced", "StockMovement", "PurchaseOrder", "Dish", "DishIngredient", "Sale", "InventoryMovement"]
