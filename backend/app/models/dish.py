from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)

    ingredients = relationship("DishIngredient", back_populates="dish", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="dish")

class DishIngredient(Base):
    __tablename__ = "dish_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    dish_id = Column(Integer, ForeignKey("dishes.id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("inventory.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)

    dish = relationship("Dish", back_populates="ingredients")
    ingredient = relationship("InventoryItem")
