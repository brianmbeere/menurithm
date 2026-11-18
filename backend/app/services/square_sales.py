import hashlib
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from urllib.parse import urlsplit

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException


@dataclass(frozen=True)
class SquareConfig:
    app_id: str
    secret: str
    redirect: str
    environment: str
    cipher: Fernet

    @property
    def base(self) -> str:
        return ("https://connect.squareup.com" if self.environment == "production"
                else "https://connect.squareupsandbox.com")


def square_config() -> SquareConfig | None:
    app_id, secret, redirect, key = (
        os.getenv(f"SQUARE_{name}", "").strip()
        for name in ("APPLICATION_ID", "APPLICATION_SECRET", "REDIRECT_URI", "TOKEN_KEY")
    )
    environment = os.getenv("SQUARE_ENVIRONMENT", "sandbox")
    if not all((app_id, secret, redirect, key)) or environment not in {"sandbox", "production"}:
        return None
    try:
        uri = urlsplit(redirect)
        if (uri.path != "/account" or not uri.hostname or uri.username or uri.query or uri.fragment
                or not (uri.scheme == "https" or (
                    environment == "sandbox" and uri.scheme == "http" and uri.hostname == "localhost"
                ))):
            return None
        _ = uri.port
        return SquareConfig(app_id, secret, redirect, environment, Fernet(key.encode()))
    except ValueError:
        return None


def square_request(config, path, *, token=None, body=None):
    headers = {"Square-Version": "2025-10-16"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        response = httpx.request(
            "GET" if body is None else "POST", f"{config.base}{path}",
            headers=headers, json=body, timeout=10,
        )
        response.raise_for_status()
        result = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(502, "Square could not complete the request. Retry or check the connection in Square.") from exc
    if not isinstance(result, dict) or result.get("errors"):
        raise HTTPException(502, "Square returned an unsuccessful response.")
    return result


def token_values(config, result):
    access = result.get("access_token")
    refresh = result.get("refresh_token")
    merchant = result.get("merchant_id")
    try:
        expiry = datetime.fromisoformat(result["expires_at"])
        if expiry.tzinfo is None:
            raise ValueError("Missing timezone")
        expiry = expiry.astimezone(timezone.utc)
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(502, "Square returned invalid token expiry details.") from exc
    if not all(isinstance(value, str) and value for value in (access, refresh, merchant)):
        raise HTTPException(502, "Square returned incomplete authorization details.")
    encrypted = config.cipher.encrypt(json.dumps({"access": access, "refresh": refresh}).encode()).decode()
    return encrypted, expiry, merchant


def decrypt_tokens(config, encrypted):
    try:
        return json.loads(config.cipher.decrypt(encrypted.encode()))
    except (InvalidToken, ValueError) as exc:
        raise HTTPException(503, "Square credentials cannot be read. Contact support.") from exc


def digest(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


@dataclass(frozen=True)
class SquareLine:
    order_id: str
    line_id: str
    catalog_id: str
    name: str
    closed_at: str
    quantity: int
    cents: int


def eligible_lines(orders, location_id, start: datetime, end: datetime):
    lines: dict[tuple[str, str], SquareLine] = {}
    skipped = 0
    for order in orders:
        order_id, closed_at = order.get("id"), order.get("closed_at")
        try:
            closed = datetime.fromisoformat(closed_at)
            valid_date = closed.tzinfo is not None and start <= closed < end
        except (TypeError, ValueError):
            valid_date = False
        items = order.get("line_items") or []
        if (not order_id or not valid_date or order.get("location_id") != location_id
                or order.get("state") != "COMPLETED" or not order.get("tenders")
                or order.get("returns") or order.get("refunds")):
            skipped += len(items)
            continue
        for item in items:
            line_id = item.get("uid")
            catalog_id = item.get("catalog_object_id")
            money = item.get("base_price_money") or {}
            try:
                qty = Decimal(item.get("quantity", "0"))
            except (InvalidOperation, TypeError):
                skipped += 1
                continue
            if (not line_id or not catalog_id or not qty.is_finite()
                    or not 1 <= qty <= 2147483647 or qty != qty.to_integral_value()
                    or item.get("quantity_unit") or item.get("item_type", "ITEM") != "ITEM"
                    or money.get("currency") != "USD" or type(money.get("amount")) is not int
                    or money["amount"] < 0):
                skipped += 1
                continue
            name = " / ".join(part for part in (item.get("name"), item.get("variation_name")) if part)
            line = SquareLine(order_id, line_id, catalog_id, name or "Unnamed Square item",
                              closed.isoformat(), int(qty), money["amount"])
            key = (order_id, line_id)
            if key in lines and lines[key] != line:
                raise HTTPException(409, "Square orders changed during the search. Preview again.")
            lines[key] = line
    return sorted(lines.values(), key=lambda line: (line.closed_at, line.order_id, line.line_id)), skipped
