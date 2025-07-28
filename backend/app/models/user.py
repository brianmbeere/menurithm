from sqlalchemy import Column, DateTime, Integer, String, Float, ForeignKey, func, Boolean
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    organization = Column(String, nullable=True)
    title = Column(String, nullable=True)
    country = Column(String, nullable=True)
    use_case = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    
    # Enhanced security fields
    role = Column(String, default="user", nullable=False)  # user, manager, admin, viewer
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    login_count = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


