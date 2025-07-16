from pydantic import BaseModel, Field

# Pydantic schemas
class UserCreate(BaseModel):
    full_name: str = Field(alias="fullName")
    organization: str | None = Field(default=None)
    title: str | None = Field(default=None)
    country: str | None = Field(default=None)
    use_case: str | None = Field(default=None, alias="useCase")
    linkedin: str | None = Field(default=None)
    email: str
    firebase_uid: str

    class Config:
        allow_population_by_field_name = True  # So backend can still refer to full_name


class UserResponse(BaseModel):
    id: int
    firebase_uid: str
    email: str
    full_name: str
    organization: str
    title: str
    country: str
    use_case: str
    linkedin: str

    model_config = {
        "from_attributes": True
    }
