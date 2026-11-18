from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, StringConstraints
from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import Session

from app.db.database import Base
from app.models.user import User
from app.utils.auth import get_current_user, get_db

router = APIRouter(prefix="/api/restaurant-profile", tags=["Restaurant profile"])

ShortText = Annotated[str, StringConstraints(max_length=150)]


class RestaurantProfileInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    full_name: Annotated[str, StringConstraints(min_length=1, max_length=150)]
    restaurant_name: ShortText = ""
    street: ShortText = ""
    suite: ShortText = ""
    city: ShortText = ""
    region: ShortText = ""
    postal_code: Annotated[str, StringConstraints(max_length=24)] = ""
    country: ShortText = ""


class DeliveryLocation(Base):
    __tablename__ = "restaurant_delivery_locations"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    street = Column(String(150), nullable=False)
    suite = Column(String(150), nullable=False)
    city = Column(String(150), nullable=False)
    region = Column(String(150), nullable=False)
    postal_code = Column(String(24), nullable=False)
    country = Column(String(150), nullable=False)


ADDRESS_FIELDS = ("street", "suite", "city", "region", "postal_code", "country")


@router.get("")
def read_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    location = db.get(DeliveryLocation, user.id)
    return {
        "full_name": user.full_name or "",
        "restaurant_name": user.organization or "",
        **{field: getattr(location, field) if location else "" for field in ADDRESS_FIELDS},
    }


@router.put("")
def save_profile(
    payload: RestaurantProfileInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    values = payload.model_dump()
    address = {field: values[field] for field in ADDRESS_FIELDS}
    if any(address.values()) and not all(
        values[field] for field in ("street", "city", "region", "postal_code", "country")
    ):
        raise HTTPException(422, "Complete the street, city, state/region, postal code and country, or clear the address.")
    owner = db.query(User).filter(User.id == user.id).with_for_update().one()
    owner.full_name = values["full_name"]
    owner.organization = values["restaurant_name"] or None
    location = db.get(DeliveryLocation, owner.id)
    if any(address.values()):
        if location is None:
            db.add(DeliveryLocation(user_id=owner.id, **address))
        else:
            for field, value in address.items():
                setattr(location, field, value)
    elif location is not None:
        db.delete(location)
    db.commit()
    return values
