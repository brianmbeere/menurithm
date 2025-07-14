from pydantic import BaseModel

# Pydantic schemas
class UserCreate(BaseModel):
    firebase_uid: str
    email: str

class UserResponse(BaseModel):
    id: int
    firebase_uid: str
    email: str

    model_config = {
        "from_attributes": True
    }
