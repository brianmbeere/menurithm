from sqlalchemy import Column, DateTime, Integer, String, Float, ForeignKey, func
from app.db.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String, unique=True, index=True)
    email = Column(String, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

