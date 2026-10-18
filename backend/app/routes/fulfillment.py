import logging
import os
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.models.user import User
from app.utils.auth_enhanced import get_current_user
from app.core.croprithm_config import get_croprithm_base_url

router = APIRouter(prefix="/api/fulfillment", tags=["Produce fulfillment"])
logger = logging.getLogger(__name__)


class OrderInput(BaseModel):
    restaurant_name: str = Field(min_length=1, max_length=200)
    produce_type: str = Field(min_length=1, max_length=200)
    quantity_needed: float = Field(gt=0, allow_inf_nan=False)
    unit: str = Field(min_length=1, max_length=30)
    method: Literal["customer_pickup", "farmer_delivery"]
    delivery_address: str = Field(default="", max_length=1000)
    delivery_window_start: str
    delivery_window_end: str
    special_requirements: str = Field(default="", max_length=2000)


class Acceptance(BaseModel):
    revision: int = Field(gt=0)


async def forward(method: str, path: str, uid: str, payload: dict | None = None):
    key = os.getenv("FULFILLMENT_BRIDGE_KEY")
    if not key:
        raise HTTPException(503, "Produce ordering is not configured. Please contact support")
    # The legacy supplier integration URL may include /api/v1; this contract is rooted at /api.
    base = httpx.URL(get_croprithm_base_url()).copy_with(path="/", query=None, fragment=None)
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.request(
                method, f"{str(base).rstrip('/')}/api/fulfillment/{path}",
                headers={"Authorization": f"Bearer {key}", "X-Customer-Id": uid},
                json=payload,
            )
    except httpx.RequestError:
        logger.exception("Croprithm fulfillment request failed")
        raise HTTPException(502, "Croprithm is unavailable. Refresh your orders before retrying")
    if response.is_error:
        logger.warning("Croprithm fulfillment returned HTTP %s", response.status_code)
        if response.status_code in [400, 403, 404, 409, 422]:
            raise HTTPException(response.status_code, response.json().get("detail", "Order request rejected"))
        raise HTTPException(502, "Croprithm could not process the request. Please retry later")
    return response.json()


@router.get("/orders")
async def list_orders(user: User = Depends(get_current_user)):
    return await forward("GET", "orders", user.firebase_uid)


@router.post("/orders")
async def create_order(data: OrderInput, user: User = Depends(get_current_user)):
    return await forward("POST", "orders", user.firebase_uid, {**data.model_dump(), "customer_contact": user.email})


@router.post("/orders/{identifier}/accept")
async def accept_quote(identifier: int, data: Acceptance, user: User = Depends(get_current_user)):
    return await forward("POST", f"orders/{identifier}/accept", user.firebase_uid, data.model_dump())
