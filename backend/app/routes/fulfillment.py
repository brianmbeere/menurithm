import logging
import os
from decimal import Decimal
from typing import Literal
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.inventory import InventoryItem
from app.models.inventory_movement import InventoryMovement
from app.models.user import User
from app.utils.auth_enhanced import get_current_user
from app.core.croprithm_config import get_croprithm_base_url
from app.services.unit_conversion import (
    UnitConversionError,
    convert_quantity,
    decimal_string,
    decimal_value,
)

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
    produce_inventory_id: int | None = Field(default=None, gt=0)
    inventory_item_id: int | None = Field(default=None, gt=0)


class Acceptance(BaseModel):
    revision: int = Field(gt=0)


class CartLine(BaseModel):
    listing_id: int = Field(gt=0)
    quantity: Decimal = Field(gt=0, max_digits=12, decimal_places=3)


class CartPreview(BaseModel):
    lines: list[CartLine] = Field(min_length=1, max_length=50)


@router.post("/marketplace/checkout-preview")
async def preview_checkout(data: CartPreview, user: User = Depends(get_current_user)):
    return await forward("POST", "marketplace/checkout-preview", user.firebase_uid, data.model_dump(mode="json"))


class ReceiptInput(BaseModel):
    quantity_received: Decimal = Field(gt=0, allow_inf_nan=False)
    unit: str = Field(min_length=1, max_length=30)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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
async def list_orders(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orders = await forward("GET", "orders", user.firebase_uid)
    if not orders:
        return orders
    references = [f"croprithm-order:{order['id']}" for order in orders]
    received_references = {
        row[0] for row in db.query(InventoryMovement.external_reference).filter(
            InventoryMovement.user_id == user.email,
            InventoryMovement.movement_type == "produce_receipt",
            InventoryMovement.external_reference.in_(references),
        ).all()
    }
    for order in orders:
        order["inventory_received"] = f"croprithm-order:{order['id']}" in received_references
    return orders


@router.get("/produce/available")
async def list_available_produce(
    produce_type: str | None = Query(default=None, max_length=100),
    location: str | None = Query(default=None, max_length=100),
    max_price: float | None = Query(default=None, ge=0),
    user: User = Depends(get_current_user),
):
    params = {
        key: value for key, value in {
            "produce_type": produce_type,
            "location": location,
            "max_price": max_price,
        }.items() if value is not None
    }
    query = urlencode(params)
    path = f"produce/available?{query}" if query else "produce/available"
    return await forward("GET", path, user.firebase_uid)


@router.post("/orders")
async def create_order(
    data: OrderInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.produce_inventory_id is not None and data.inventory_item_id is None:
        raise HTTPException(422, "Select a kitchen ingredient to receive this produce into.")
    if data.inventory_item_id is not None:
        item = db.query(InventoryItem).filter(
            InventoryItem.id == data.inventory_item_id,
            InventoryItem.user_id == user.email,
        ).first()
        if item is None:
            raise HTTPException(404, "Kitchen ingredient not found.")
    payload = data.model_dump(exclude={"inventory_item_id"})
    payload["menurithm_inventory_item_id"] = data.inventory_item_id
    payload["customer_contact"] = user.email
    return await forward("POST", "orders", user.firebase_uid, payload)


@router.post("/orders/{identifier}/accept")
async def accept_quote(identifier: int, data: Acceptance, user: User = Depends(get_current_user)):
    return await forward("POST", f"orders/{identifier}/accept", user.firebase_uid, data.model_dump())


@router.post("/orders/{identifier}/cancel")
async def cancel_order(identifier: int, user: User = Depends(get_current_user)):
    return await forward("POST", f"orders/{identifier}/cancel", user.firebase_uid)


@router.post("/orders/{identifier}/receive")
async def receive_order(
    identifier: int,
    data: ReceiptInput,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orders = await forward("GET", "orders", user.firebase_uid)
    order = next((entry for entry in orders if entry.get("id") == identifier), None)
    if order is None:
        raise HTTPException(404, "Produce order not found.")
    if order.get("stage") not in {"collected", "delivered"}:
        raise HTTPException(409, "The farmer must mark the order collected or delivered first.")
    inventory_item_id = order.get("menurithm_inventory_item_id")
    if inventory_item_id is None:
        raise HTTPException(409, "This request is not linked to a kitchen ingredient.")

    item = db.query(InventoryItem).filter(
        InventoryItem.id == inventory_item_id,
        InventoryItem.user_id == user.email,
    ).with_for_update().first()
    if item is None:
        raise HTTPException(404, "Linked kitchen ingredient no longer exists.")
    if not item.unit:
        raise HTTPException(422, "Set a unit for the linked kitchen ingredient before receiving produce.")
    external_reference = f"croprithm-order:{identifier}"
    movement_query = db.query(InventoryMovement).filter(
        InventoryMovement.user_id == user.email,
        InventoryMovement.external_reference == external_reference,
        InventoryMovement.inventory_item_id == item.id,
        InventoryMovement.movement_type == "produce_receipt",
    )
    existing = movement_query.first()
    if existing is not None:
        return {"status": "already_received", "movement": existing}

    try:
        quantity_received = decimal_value(data.quantity_received, "Received quantity")
        quantity_to_add = convert_quantity(data.quantity_received, data.unit, item.unit)
        current_quantity = decimal_value(item.quantity, "Inventory quantity")
    except (ValueError, UnitConversionError) as exc:
        raise HTTPException(422, str(exc)) from exc
    if quantity_received <= 0 or quantity_to_add <= 0:
        raise HTTPException(422, "Received quantity must be greater than zero.")

    new_quantity = current_quantity + quantity_to_add
    movement = InventoryMovement(
        user_id=user.email,
        inventory_item_id=item.id,
        external_reference=external_reference,
        movement_type="produce_receipt",
        quantity_change=decimal_string(quantity_to_add),
        quantity_before=decimal_string(current_quantity),
        quantity_after=decimal_string(new_quantity),
        unit=item.unit,
        reason=f"Confirmed receipt of Croprithm order #{identifier}",
    )
    try:
        with db.begin_nested():
            item.quantity = decimal_string(new_quantity)
            db.add(movement)
            db.flush()
    except IntegrityError:
        existing = movement_query.first()
        if existing is None:
            raise
        return {"status": "already_received", "movement": existing}
    db.commit()
    db.refresh(movement)
    return {"status": "received", "movement": movement}


@router.get("/orders/{identifier}/receipt")
async def get_order_receipt(
    identifier: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orders = await forward("GET", "orders", user.firebase_uid)
    order = next((entry for entry in orders if entry.get("id") == identifier), None)
    if order is None:
        raise HTTPException(404, "Produce order not found.")

    movement = db.query(InventoryMovement).filter(
        InventoryMovement.user_id == user.email,
        InventoryMovement.external_reference == f"croprithm-order:{identifier}",
        InventoryMovement.movement_type == "produce_receipt",
    ).first()
    if movement is None:
        raise HTTPException(404, "No confirmed inventory receipt exists for this order.")

    item = db.query(InventoryItem).filter(
        InventoryItem.id == movement.inventory_item_id,
        InventoryItem.user_id == user.email,
    ).first()
    if item is None:
        raise HTTPException(404, "The ingredient for this receipt no longer exists.")

    return {
        "receipt_number": f"MEN-RCV-{movement.id:06d}",
        "order_id": identifier,
        "request_id": order.get("request_id"),
        "received_at": movement.created_at.isoformat(),
        "restaurant_name": order.get("restaurant_name"),
        "produce_type": order.get("produce_type"),
        "ingredient_name": item.ingredient_name,
        "quantity_received": movement.quantity_change,
        "unit": movement.unit,
        "stock_before": movement.quantity_before,
        "stock_after": movement.quantity_after,
        "farmer_name": order.get("farmer_name"),
        "farmer_contact": order.get("farmer_contact"),
        "fulfillment_method": order.get("method"),
        "notice": "Inventory receiving record only; not proof of purchase or payment.",
    }
