import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Depends, Header
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user import User
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

path_to_json = os.path.join(BASE_DIR,"../core/menurithm-firebase-adminsdk-fbsvc-36044de71d.json")
cred = credentials.Certificate(path_to_json)
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

    user_record = db.query(User).filter_by(firebase_uid=firebase_uid).first()
    if not user_record:
        user_record = User(firebase_uid=firebase_uid, email=email)
        db.add(user_record)
        db.commit()
        db.refresh(user_record)
    return user_record
