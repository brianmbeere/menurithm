from sqlalchemy import Column, Integer, String, Float, Date
from app.db.database import Base

class SalesRecord(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    dish_name = Column(String, nullable=False)
    quantity_sold = Column(Integer)
    price_per_unit = Column(Float)
