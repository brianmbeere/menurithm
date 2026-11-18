import secrets
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException
from pydantic import AwareDatetime, BaseModel, Field
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.database import Base
from app.models.dish import Dish
from app.models.sales import Sale
from app.models.user import User
from app.services.sales_processing import SaleProcessingError, record_sale
from app.services.square_sales import (
    decrypt_tokens, digest, eligible_lines, square_config, square_request, token_values,
)
from app.utils.auth import get_current_user, get_db

router = APIRouter(prefix="/api/square", tags=["Square sales"])


class SquareAuthorization(Base):
    __tablename__ = "square_authorizations"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    state_hash = Column(String(64), nullable=False)
    expires_at = Column(DateTime, nullable=False)


class SquareConnection(Base):
    __tablename__ = "square_connections"
    __table_args__ = (UniqueConstraint("environment", "merchant_id", name="uq_square_environment_merchant"),)

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    environment = Column(String(16), nullable=False)
    merchant_id = Column(String(191), nullable=False)
    encrypted_tokens = Column(Text, nullable=False)
    expires_at = Column(DateTime, nullable=False)


class AuthorizationCode(BaseModel):
    code: str = Field(min_length=1, max_length=2048)
    state: str = Field(min_length=32, max_length=128)


class SalesRange(BaseModel):
    location_id: str = Field(min_length=1, max_length=191)
    start: AwareDatetime
    end: AwareDatetime


class SalesImport(SalesRange):
    revision: str = Field(pattern=r"^[a-f0-9]{64}$")
    mappings: dict[str, int] = Field(min_length=1, max_length=1000)


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def require_config():
    config = square_config()
    if config is None:
        raise HTTPException(503, "Square is not configured for this Menurithm environment.")
    return config


def lock_owner(db, user):
    db.query(User.id).filter(User.id == user.id).with_for_update().one()


@router.get("")
def status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = square_config()
    connection = db.get(SquareConnection, user.id)
    return {
        "configured": config is not None,
        "connected": connection is not None,
        "environment": config.environment if config else None,
        "redirect_uri": config.redirect if config else None,
    }


@router.post("/authorize")
def authorize(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = require_config()
    lock_owner(db, user)
    if db.get(SquareConnection, user.id) is not None:
        raise HTTPException(409, "Disconnect the linked Square account before connecting another.")
    state = secrets.token_urlsafe(32)
    db.merge(SquareAuthorization(user_id=user.id, state_hash=digest(state),
                                 expires_at=now() + timedelta(minutes=10)))
    db.commit()
    params = {"client_id": config.app_id, "scope": "ORDERS_READ MERCHANT_PROFILE_READ",
              "state": state, "redirect_uri": config.redirect}
    if config.environment == "production":
        params["session"] = "false"
    return {"url": f"{config.base}/oauth2/authorize?{urlencode(params)}", "state": state}


@router.post("/connect")
def connect(payload: AuthorizationCode, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = require_config()
    user_id = user.id
    lock_owner(db, user)
    authorization = db.get(SquareAuthorization, user_id)
    if (authorization is None or authorization.expires_at <= now()
            or not secrets.compare_digest(authorization.state_hash, digest(payload.state))):
        raise HTTPException(400, "Square authorization expired or does not match. Start again from Sales.")
    if db.get(SquareConnection, user_id) is not None:
        raise HTTPException(409, "This account already has a Square connection.")
    db.delete(authorization)
    db.commit()
    result = square_request(config, "/oauth2/token", body={
        "client_id": config.app_id, "client_secret": config.secret, "code": payload.code,
        "grant_type": "authorization_code", "redirect_uri": config.redirect,
    })
    encrypted, expiry, merchant = token_values(config, result)
    db.add(SquareConnection(user_id=user_id, environment=config.environment,
                            merchant_id=merchant, encrypted_tokens=encrypted,
                            expires_at=expiry.replace(tzinfo=None)))
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "That Square seller or Menurithm account already has a connection.") from exc
    return {"connected": True}


def connection_token(config, db, connection):
    if connection.environment != config.environment:
        raise HTTPException(409, "This connection belongs to another Square environment. Disconnect and reconnect.")
    tokens = decrypt_tokens(config, connection.encrypted_tokens)
    if connection.expires_at > now() + timedelta(minutes=5):
        return tokens["access"]
    result = square_request(config, "/oauth2/token", body={
        "client_id": config.app_id, "client_secret": config.secret,
        "grant_type": "refresh_token", "refresh_token": tokens["refresh"],
    })
    encrypted, expiry, merchant = token_values(config, result)
    if merchant != connection.merchant_id:
        raise HTTPException(502, "Square returned a different seller for this connection.")
    connection.encrypted_tokens = encrypted
    connection.expires_at = expiry.replace(tzinfo=None)
    return result["access_token"]


def get_connection(db, user):
    lock_owner(db, user)
    connection = db.get(SquareConnection, user.id)
    if connection is None:
        raise HTTPException(409, "Connect Square before importing sales.")
    return connection


@router.delete("")
def disconnect(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lock_owner(db, user)
    connection = db.get(SquareConnection, user.id)
    authorization = db.get(SquareAuthorization, user.id)
    if connection is not None:
        db.delete(connection)
    if authorization is not None:
        db.delete(authorization)
    db.commit()
    return {"connected": False}


@router.get("/locations")
def locations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = require_config()
    token = connection_token(config, db, get_connection(db, user))
    result = square_request(config, "/v2/locations", token=token)
    db.commit()
    return [{"id": item["id"], "name": item.get("name") or item["id"]}
            for item in result.get("locations", []) if item.get("id")]


def load_sales(db, user, payload):
    if not timedelta(0) < payload.end - payload.start <= timedelta(days=8):
        raise HTTPException(422, "Choose a range of up to seven calendar days.")
    config = require_config()
    connection = get_connection(db, user)
    token = connection_token(config, db, connection)
    query = {
        "location_ids": [payload.location_id],
        "limit": 100,
        "query": {
            "filter": {
                "state_filter": {"states": ["COMPLETED"]},
                "date_time_filter": {"closed_at": {
                    "start_at": payload.start.isoformat(), "end_at": payload.end.isoformat(),
                }},
            },
            "sort": {"sort_field": "CLOSED_AT", "sort_order": "ASC"},
        },
    }
    orders = []
    for _ in range(10):
        page = square_request(config, "/v2/orders/search", token=token, body=query)
        orders.extend(page.get("orders") or [])
        if not page.get("cursor"):
            break
        query["cursor"] = page["cursor"]
    else:
        raise HTTPException(422, "Too many Square orders in this range. Choose a shorter range.")
    lines, skipped = eligible_lines(orders, payload.location_id, payload.start, payload.end)
    if len(lines) > 5000:
        raise HTTPException(422, "Too many Square items in this range. Choose a shorter range.")
    revision = digest([connection.environment, connection.merchant_id, payload.location_id,
                       payload.start.isoformat(), payload.end.isoformat(), [asdict(line) for line in lines]])
    identifiers = {f"square:{digest([connection.environment, connection.merchant_id, line.order_id, line.line_id])}": line
                   for line in lines}
    existing = set()
    keys = list(identifiers)
    for offset in range(0, len(keys), 500):
        existing.update(row[0] for row in db.query(Sale.idempotency_key).filter(
            Sale.user_id == user.email, Sale.idempotency_key.in_(keys[offset:offset + 500]),
        ))
    return identifiers, existing, revision, skipped


@router.post("/preview")
def preview(payload: SalesRange, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lines, existing, revision, skipped = load_sales(db, user, payload)
    items = {}
    for key, line in lines.items():
        if key in existing:
            continue
        item = items.setdefault(line.catalog_id, {"id": line.catalog_id, "name": line.name, "lines": 0, "quantity": 0})
        item["lines"] += 1
        item["quantity"] += line.quantity
    dishes = [{"id": dish.id, "name": dish.name} for dish in db.query(Dish)
              .filter(Dish.user_id == user.email).order_by(Dish.name)]
    db.commit()
    return {"revision": revision, "items": list(items.values()), "dishes": dishes,
            "already_imported": len(existing), "unsupported": skipped}


@router.post("/import")
def import_sales(payload: SalesImport, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lines, existing, revision, unsupported = load_sales(db, user, payload)
    if revision != payload.revision:
        raise HTTPException(409, "Square sales changed after preview. Preview again before importing.")
    if not payload.mappings.keys() <= {line.catalog_id for line in lines.values()}:
        raise HTTPException(422, "Select only Square items from the preview.")
    dishes = {dish.id: dish.name for dish in db.query(Dish).filter(
        Dish.user_id == user.email, Dish.id.in_(set(payload.mappings.values())),
    )}
    if set(payload.mappings.values()) - dishes.keys():
        raise HTTPException(422, "A selected dish no longer exists in your workspace.")
    imported = needs_attention = unmapped = 0
    try:
        if db.get_bind().dialect.name == "sqlite":
            # Start a write transaction before record_sale opens its first SAVEPOINT.
            db.execute(update(User).where(User.id == user.id).values(id=User.id))
        for key, line in lines.items():
            if key in existing:
                continue
            if line.catalog_id not in payload.mappings:
                unmapped += 1
                continue
            sale, duplicate = record_sale(
                db, user_id=user.email, dish_name=dishes[payload.mappings[line.catalog_id]],
                timestamp=datetime.fromisoformat(line.closed_at).astimezone(timezone.utc).replace(tzinfo=None),
                quantity_sold=line.quantity, price_per_unit=line.cents / 100, idempotency_key=key,
            )
            if not duplicate:
                imported += 1
                needs_attention += int(sale.processing_status == "needs_attention")
        db.commit()
    except SaleProcessingError as exc:
        db.rollback()
        raise HTTPException(409, "Sales could not be imported. Review your dish mappings and preview again.") from exc
    return {"imported": imported, "needs_attention": needs_attention, "unmapped": unmapped,
            "already_imported": len(existing), "unsupported": unsupported}
