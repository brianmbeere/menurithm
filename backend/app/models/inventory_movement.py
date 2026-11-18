from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.database import Base


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    inventory_item_id = Column(Integer, ForeignKey("inventory.id"), nullable=False)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=True, index=True)
    external_reference = Column(String(128), nullable=True)
    processing_version = Column(Integer, nullable=False, default=1)
    movement_type = Column(String, nullable=False)
    quantity_change = Column(String, nullable=False)
    quantity_before = Column(String, nullable=False)
    quantity_after = Column(String, nullable=False)
    unit = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    inventory_item = relationship("InventoryItem")
    sale = relationship("Sale")

    __table_args__ = (
        UniqueConstraint(
            "sale_id",
            "inventory_item_id",
            "processing_version",
            "movement_type",
            name="uq_inventory_movement_sale_version",
        ),
        UniqueConstraint(
            "user_id",
            "external_reference",
            "inventory_item_id",
            "movement_type",
            name="uq_inventory_movement_external_receipt",
        ),
    )
