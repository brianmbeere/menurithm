from sqlalchemy import Column, Integer, String, Date
from app.db.database import Base

class InventoryItem(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    ingredient_name = Column(String, nullable=False)
    quantity = Column(String)
    unit = Column(String)
    category = Column(String)
    expiry_date = Column(Date)
    storage_location = Column(String)
