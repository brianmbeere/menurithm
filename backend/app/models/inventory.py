from sqlalchemy import Column, ForeignKey, Integer, String, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.database import Base

class InventoryItem(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ingredient_name = Column(String, nullable=False, unique=True) 
    quantity = Column(String)
    unit = Column(String)
    category = Column(String)
    expiry_date = Column(Date)
    storage_location = Column(String)

    # Relationship to DishIngredient
    dish_ingredients = relationship("DishIngredient", back_populates="ingredient")

    __table_args__ = (
        UniqueConstraint('ingredient_name', name='uq_ingredient_name'),
    )

