# Import all models to ensure proper relationship initialization
from .user import User
from .inventory import InventoryItem
from .dish import Dish, DishIngredient
from .sales import Sale

# Make all models available when importing from app.models
__all__ = ["User", "InventoryItem", "Dish", "DishIngredient", "Sale"]
