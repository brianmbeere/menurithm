import os
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

import pytest
from cryptography.fernet import Fernet
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
with patch("firebase_admin.credentials.Certificate"), patch("firebase_admin.initialize_app"):
    from app.db.database import Base
    from app.models.dish import Dish, DishIngredient
    from app.models.inventory import InventoryItem
    from app.models.sales import Sale
    from app.models.user import User
    from app.routes import restaurant_profile, square_sales
    from app.utils.auth import get_current_user, get_db


@pytest.fixture
def workspace():
    engine = create_engine("sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add_all([User(id=1, firebase_uid="one", email="one@example.com", full_name="Original"),
                    User(id=2, firebase_uid="two", email="two@example.com", full_name="Separate")])
        db.commit()
    app = FastAPI()
    app.include_router(restaurant_profile.router)
    app.include_router(square_sales.router)
    owner = {"id": 1}

    def database():
        with Session(engine) as db:
            yield db

    def current_user():
        with Session(engine) as db:
            return db.get(User, owner["id"])

    app.dependency_overrides.update({get_db: database, get_current_user: current_user})
    with TestClient(app) as client:
        yield client, engine, owner
    engine.dispose()


def test_restaurant_profile_saves_and_clears_an_owner_only_location(workspace):
    client, _, owner = workspace
    path = "/api/restaurant-profile"
    data = {"full_name": " New contact ", "restaurant_name": "Pilot Kitchen",
            "street": "11 Market St", "suite": "Rear entrance", "city": "Austin",
            "region": "TX", "postal_code": "78701", "country": "United States"}
    assert client.put(path, json={**data, "country": ""}).status_code == 422
    assert client.put(path, json={**data, "email": "new@example.com"}).status_code == 422
    assert client.put(path, json=data).status_code == 200
    assert client.get(path).json() == {**data, "full_name": "New contact"}
    owner["id"] = 2
    assert client.get(path).json()["full_name"] == "Separate"
    assert client.get(path).json()["street"] == ""
    owner["id"] = 1
    assert client.put(path, json={"full_name": "New contact"}).status_code == 200
    assert client.get(path).json()["street"] == ""


def test_square_connection_and_reviewed_import_only_deduct_once(workspace, monkeypatch):
    client, engine, owner = workspace
    for key, value in {
        "SQUARE_ENVIRONMENT": "sandbox", "SQUARE_APPLICATION_ID": "fixture",
        "SQUARE_APPLICATION_SECRET": "fixture-secret", "SQUARE_REDIRECT_URI": "https://test.example.com/account",
        "SQUARE_TOKEN_KEY": Fernet.generate_key().decode(),
    }.items():
        monkeypatch.setenv(key, value)
    item = {"uid": "line1", "catalog_object_id": "variation", "name": "Soup", "quantity": "10",
            "base_price_money": {"currency": "USD", "amount": 1250}}
    order = {"id": "order1", "location_id": "kitchen", "closed_at": "2026-11-18T12:00:00Z",
             "state": "COMPLETED", "tenders": [{"id": "fixture"}],
             "line_items": [item, {**item, "uid": "line2", "quantity": "1.5"}]}

    def square(config, path, *, token=None, body=None):
        if path == "/oauth2/token":
            assert body["grant_type"] == "authorization_code"
            return {"access_token": "memory-access", "refresh_token": "memory-refresh",
                    "merchant_id": "seller", "expires_at": "2099-12-01T10:00:00Z"}
        assert token == "memory-access"
        if path == "/v2/locations":
            return {"locations": [{"id": "kitchen", "name": "Kitchen"}]}
        assert path == "/v2/orders/search"
        assert body["location_ids"] == ["kitchen"]
        if not body.get("cursor"):
            return {"orders": [], "cursor": "page-two"}
        return {"orders": [order]}

    monkeypatch.setattr(square_sales, "square_request", square)
    with Session(engine) as db:
        dish = Dish(name="Tomato soup", user_id="one@example.com", recipe_yield=1)
        stock = InventoryItem(ingredient_name="Tomato", user_id="one@example.com", quantity="12", unit="lb")
        db.add_all([dish, stock])
        db.flush()
        db.add(DishIngredient(user_id="one@example.com", dish_id=dish.id, ingredient_id=stock.id,
                              quantity=1, quantity_decimal=1, unit="lb"))
        other = Dish(name="Other dish", user_id="two@example.com", recipe_yield=1)
        db.add(other)
        db.flush()
        dish_id, stock_id, other_id = dish.id, stock.id, other.id
        db.commit()

    base = "/api/square"
    authorize = client.post(f"{base}/authorize").json()
    assert parse_qs(urlsplit(authorize["url"]).query)["scope"] == ["ORDERS_READ MERCHANT_PROFILE_READ"]
    callback = {"code": "fixture-code", "state": authorize["state"]}
    owner["id"] = 2
    assert client.post(f"{base}/connect", json=callback).status_code == 400
    owner["id"] = 1
    assert client.post(f"{base}/connect", json=callback).json() == {"connected": True}
    assert client.post(f"{base}/connect", json=callback).status_code == 400
    with Session(engine) as db:
        assert "memory-access" not in db.get(square_sales.SquareConnection, 1).encrypted_tokens
    assert client.get(f"{base}/locations").json() == [{"id": "kitchen", "name": "Kitchen"}]
    range_data = {"location_id": "kitchen", "start": "2026-11-18T00:00:00Z", "end": "2026-11-19T00:00:00Z"}
    preview = client.post(f"{base}/preview", json=range_data).json()
    assert preview["items"] == [{"id": "variation", "name": "Soup", "lines": 1, "quantity": 10}]
    assert preview["unsupported"] == 1
    assert preview["dishes"] == [{"id": dish_id, "name": "Tomato soup"}]
    data = {**range_data, "revision": preview["revision"], "mappings": {"variation": dish_id}}
    assert client.post(f"{base}/import", json={**data, "mappings": {"variation": other_id}}).status_code == 422
    item["quantity"] = "9"
    assert client.post(f"{base}/import", json=data).status_code == 409
    item["quantity"] = "10"
    first = client.post(f"{base}/import", json=data).json()
    retry = client.post(f"{base}/import", json=data).json()
    assert first["imported"] == 1 and first["needs_attention"] == 0
    assert retry["imported"] == 0 and retry["already_imported"] == 1
    assert client.delete(base).json() == {"connected": False}
    with Session(engine) as db:
        assert db.query(Sale).one().price_per_unit == 12.5
        assert db.get(InventoryItem, stock_id).quantity == "2"
        assert db.get(square_sales.SquareConnection, 1) is None
