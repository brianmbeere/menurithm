from sqlalchemy import Column, ForeignKey, Integer, String, Date, Float, DateTime, Boolean, Text, Enum
from sqlalchemy.orm import relationship
from app.db.database import Base
import enum
from datetime import datetime

class StockAlertLevel(enum.Enum):
    LOW = "low"
    CRITICAL = "critical"
    OUT_OF_STOCK = "out_of_stock"
    EXPIRING_SOON = "expiring_soon"

class InventoryStatus(enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    RESERVED = "reserved"
    ORDERED = "ordered"

class InventoryItemEnhanced(Base):
    __tablename__ = "inventory_enhanced"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    ingredient_name = Column(String, nullable=False, index=True)
    
    # Existing fields (enhanced)
    quantity = Column(Float, nullable=False)  # Changed from String to Float
    unit = Column(String, nullable=False)
    category = Column(String, index=True)
    expiry_date = Column(Date)
    storage_location = Column(String)
    
    # New inventory management fields
    cost_per_unit = Column(Float)  # For cost tracking
    supplier_name = Column(String)
    supplier_id = Column(String)  # For RouteCast integration
    minimum_stock_level = Column(Float, default=0)  # Alert threshold
    maximum_stock_level = Column(Float)  # Overstocking prevention
    reorder_point = Column(Float)  # Auto-reorder trigger
    reorder_quantity = Column(Float)  # Standard reorder amount
    
    # Status and alerts
    status = Column(Enum(InventoryStatus), default=InventoryStatus.ACTIVE)
    alert_level = Column(Enum(StockAlertLevel))
    last_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Purchase tracking
    last_purchase_date = Column(Date)
    last_purchase_price = Column(Float)
    average_weekly_usage = Column(Float)  # ML prediction input
    
    # Speech-to-text additions
    last_voice_update = Column(DateTime)
    voice_notes = Column(Text)  # Store voice transcriptions
    
    # AI/ML fields
    predicted_expiry_date = Column(Date)  # AI-predicted based on usage
    demand_forecast = Column(Float)  # Next week's predicted usage
    optimal_stock_level = Column(Float)  # ML-optimized stock level
    
    # Relationships
    dish_ingredients = relationship("DishIngredient", back_populates="ingredient")
    purchase_orders = relationship("PurchaseOrder", back_populates="inventory_item")
    stock_movements = relationship("StockMovement", back_populates="inventory_item")

class StockMovement(Base):
    """Track all inventory movements for better analytics"""
    __tablename__ = "stock_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    inventory_item_id = Column(Integer, ForeignKey("inventory_enhanced.id"))
    user_id = Column(String, nullable=False, index=True)
    
    movement_type = Column(String)  # 'purchase', 'usage', 'waste', 'adjustment'
    quantity_change = Column(Float)  # Positive for additions, negative for usage
    quantity_before = Column(Float)
    quantity_after = Column(Float)
    
    reason = Column(String)  # 'dish_preparation', 'spoilage', 'delivery', etc.
    timestamp = Column(DateTime, default=datetime.utcnow)
    reference_id = Column(String)  # Link to sale, dish preparation, etc.
    
    # Voice input tracking
    voice_input = Column(Boolean, default=False)
    voice_confidence = Column(Float)  # Speech recognition confidence
    
    inventory_item = relationship("InventoryItemEnhanced", back_populates="stock_movements")

class PurchaseOrder(Base):
    """Integration with RouteCast and supplier management"""
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    inventory_item_id = Column(Integer, ForeignKey("inventory_enhanced.id"))
    
    supplier_name = Column(String, nullable=False)
    supplier_id = Column(String)  # RouteCast supplier ID
    order_date = Column(DateTime, default=datetime.utcnow)
    expected_delivery_date = Column(Date)
    actual_delivery_date = Column(Date)
    
    quantity_ordered = Column(Float)
    quantity_received = Column(Float)
    unit_price = Column(Float)
    total_cost = Column(Float)
    
    status = Column(String)  # 'pending', 'ordered', 'delivered', 'cancelled'
    routecast_order_id = Column(String)  # External order reference
    
    # AI suggestions
    ai_suggested = Column(Boolean, default=False)
    urgency_score = Column(Float)  # 1-10 based on stock levels and demand
    
    inventory_item = relationship("InventoryItemEnhanced", back_populates="purchase_orders")

class DishPrediction(Base):
    """AI/ML predictions for dish recommendations"""
    __tablename__ = "dish_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    dish_id = Column(Integer, ForeignKey("dishes.id"))
    
    prediction_date = Column(Date, nullable=False)
    predicted_demand = Column(Float)  # Expected number of sales
    confidence_score = Column(Float)  # Model confidence (0-1)
    
    # Factors influencing prediction
    seasonal_factor = Column(Float)
    trend_factor = Column(Float)
    inventory_availability = Column(Float)
    profit_margin = Column(Float)
    
    # Recommendation scores
    profitability_score = Column(Float)
    feasibility_score = Column(Float)  # Based on ingredient availability
    overall_recommendation_score = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    dish = relationship("Dish")

class SupplierCatalog(Base):
    """RouteCast supplier integration"""
    __tablename__ = "supplier_catalog"
    
    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(String, nullable=False, index=True)
    supplier_name = Column(String, nullable=False)
    
    ingredient_name = Column(String, nullable=False, index=True)
    supplier_product_id = Column(String)
    unit = Column(String)
    price_per_unit = Column(Float)
    minimum_order_quantity = Column(Float)
    
    availability = Column(Boolean, default=True)
    delivery_time_days = Column(Integer)
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    # Quality metrics
    quality_rating = Column(Float)  # 1-5 stars
    reliability_score = Column(Float)  # On-time delivery percentage
