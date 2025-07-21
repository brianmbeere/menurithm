from sqlalchemy import Column, Integer, String, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.database import Base

class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String)  # Changed from Integer to String (email)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    ingredients = relationship("DishIngredient", back_populates="dish", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="dish")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uq_user_dish_name'),
    )

class DishIngredient(Base):
    __tablename__ = "dish_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)  # Changed from Integer to String (email)
    dish_id = Column(Integer, ForeignKey("dishes.id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("inventory.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)

    dish = relationship("Dish", back_populates="ingredients")
    ingredient = relationship("InventoryItem", back_populates="dish_ingredients")
