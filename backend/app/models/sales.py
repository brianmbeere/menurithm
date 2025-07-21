from sqlalchemy import Column, Integer, ForeignKey, DateTime, Float, String
from app.db.database import Base
from sqlalchemy.orm import relationship

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)  # Changed from Integer to String (email)
    timestamp = Column(DateTime, nullable=False)
    dish_id = Column(Integer, ForeignKey("dishes.id"))
    quantity_sold = Column(Integer, nullable=False) 
    price_per_unit = Column(Float, nullable=False)  

    dish = relationship("Dish", back_populates="sales")
