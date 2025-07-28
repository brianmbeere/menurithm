from sqlalchemy import Column, ForeignKey, Integer, String, Date, Float, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime

class SalesAnalytics(Base):
    """Enhanced sales tracking for ML predictions"""
    __tablename__ = "sales_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"))
    dish_id = Column(Integer, ForeignKey("dishes.id"))
    
    # Time-based analysis
    hour_of_day = Column(Integer)  # 0-23
    day_of_week = Column(Integer)  # 1-7 (Monday=1)
    week_of_month = Column(Integer)  # 1-5
    month = Column(Integer)  # 1-12
    is_weekend = Column(Boolean)
    is_holiday = Column(Boolean)
    
    # Weather impact (if integrated)
    weather_condition = Column(String)  # 'sunny', 'rainy', 'cloudy'
    temperature = Column(Float)
    
    # Customer behavior
    order_size = Column(Integer)  # Number of dishes in order
    customer_type = Column(String)  # 'dine_in', 'takeout', 'delivery'
    
    # Profitability analysis
    ingredient_cost = Column(Float)
    labor_cost = Column(Float)  # Estimated preparation time cost
    profit_margin = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sale = relationship("Sale")
    dish = relationship("Dish")

class DemandPattern(Base):
    """Store learned demand patterns for predictions"""
    __tablename__ = "demand_patterns"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    dish_id = Column(Integer, ForeignKey("dishes.id"))
    
    # Pattern identification
    pattern_type = Column(String)  # 'daily', 'weekly', 'seasonal', 'trend'
    pattern_strength = Column(Float)  # How strong this pattern is (0-1)
    
    # Time-based patterns
    peak_hours = Column(String)  # JSON: ["12", "13", "18", "19"]
    peak_days = Column(String)   # JSON: ["friday", "saturday", "sunday"]
    seasonal_multiplier = Column(Float)
    
    # Trend analysis
    growth_rate = Column(Float)  # Weekly growth/decline rate
    volatility = Column(Float)   # How much demand varies
    
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    dish = relationship("Dish")
