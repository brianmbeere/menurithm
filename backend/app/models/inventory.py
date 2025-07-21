from sqlalchemy import Column, ForeignKey, Integer, String, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.database import Base

class InventoryItem(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)  # Changed from Integer to String (email)
    ingredient_name = Column(String, nullable=False) 
    quantity = Column(String)
    unit = Column(String)
    category = Column(String)
    expiry_date = Column(Date)
    storage_location = Column(String)

    # Relationship to DishIngredient
    dish_ingredients = relationship("DishIngredient", back_populates="ingredient")

    __table_args__ = (
        UniqueConstraint('user_id', 'ingredient_name', name='uq_user_ingredient_name'),
    )

