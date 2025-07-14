import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Depends, Header
from sqlalchemy.orm import Session
from db.database import SessionLocal
from app.models import User

cred = credentials.Certificate("firebase_service_account.json")
firebase_admin.initialize_app(cred)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=403, detail="Invalid auth header")
    
    token = authorization.split(" ")[1]
    try:
        decoded = auth.verify_id_token(token)
        firebase_uid = decoded["uid"]
        email = decoded.get("email")
    except:
        raise HTTPException(status_code=403, detail="Invalid token")

    user = db.query(User).filter_by(firebase_uid=firebase_uid).first()
    if not user:
        user = User(firebase_uid=firebase_uid, email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
