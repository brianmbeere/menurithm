from sqlalchemy import Column, Integer, ForeignKey, DateTime, Float, String, Text, UniqueConstraint
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
    processing_status = Column(String, nullable=False, default="pending")
    processing_error = Column(Text)
    processed_at = Column(DateTime)
    processing_version = Column(Integer, nullable=False, default=1)
    idempotency_key = Column(String(128))
    csv_upload_hash = Column(String(64))
    csv_row_number = Column(Integer)

    dish = relationship("Dish", back_populates="sales")

    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_sale_user_idempotency"),
        UniqueConstraint("user_id", "csv_upload_hash", "csv_row_number", name="uq_sale_csv_source"),
    )
