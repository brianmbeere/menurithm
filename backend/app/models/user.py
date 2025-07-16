from sqlalchemy import Column, DateTime, Integer, String, Float, ForeignKey, func
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
    created_at = Column(DateTime(timezone=True), server_default=func.now())


