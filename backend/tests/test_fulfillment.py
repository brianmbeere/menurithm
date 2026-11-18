import os
from types import SimpleNamespace
from unittest.mock import patch

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
ASYNC_CLIENT = httpx.AsyncClient

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
with patch("firebase_admin.credentials.Certificate"), patch("firebase_admin.initialize_app"):
    from app.routes import fulfillment
    from app.db.database import Base
    from app.models.dish import Dish, DishIngredient
    from app.models.inventory import InventoryItem
    from app.models.inventory_movement import InventoryMovement
    from app.models.sales import Sale


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("FULFILLMENT_BRIDGE_KEY", "test-only-bridge")
    monkeypatch.setenv("CROPRITHM_BASE_URL", "https://api.croprithm.com/api/v1")
    app = FastAPI()
    app.include_router(fulfillment.router)
    app.dependency_overrides[fulfillment.get_current_user] = lambda: SimpleNamespace(
        firebase_uid="customer-one", email="customer@example.com"
    )
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_sessions = sessionmaker(bind=engine)
    app.state.test_sessions = test_sessions

    def get_test_db():
        with test_sessions() as db:
            yield db

    app.dependency_overrides[fulfillment.get_db] = get_test_db
    with TestClient(app) as client:
        yield client
    Base.metadata.drop_all(engine)
    engine.dispose()


def mock_upstream(monkeypatch, handler):
    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(fulfillment.httpx, "AsyncClient", lambda **kwargs: ASYNC_CLIENT(transport=transport, **kwargs))


def test_proxy_uses_server_identity_and_root_api_path(client, monkeypatch):
    def handler(request):
        assert str(request.url) == "https://api.croprithm.com/api/fulfillment/orders"
        assert request.headers["authorization"] == "Bearer test-only-bridge"
        assert request.headers["x-customer-id"] == "customer-one"
        return httpx.Response(200, json=[{"id": 1, "stage": "quoted"}])
    mock_upstream(monkeypatch, handler)
    result = client.get("/api/fulfillment/orders", headers={"X-Customer-Id": "someone-else"})
    assert result.status_code == 200
    assert result.json() == [{"id": 1, "stage": "quoted", "inventory_received": False}]


def test_quote_revision_is_forwarded_and_conflicts_are_not_success(client, monkeypatch):
    def handler(request):
        assert request.url.path == "/api/fulfillment/orders/8/accept"
        assert request.read() == b'{"revision":2}'
        return httpx.Response(409, json={"detail": "Quote changed"})
    mock_upstream(monkeypatch, handler)
    result = client.post("/api/fulfillment/orders/8/accept", json={"revision": 2})
    assert result.status_code == 409
    assert result.json()["detail"] == "Quote changed"
    assert client.post("/api/fulfillment/orders/8/accept", json={"revision": 0}).status_code == 422


def test_cancel_is_forwarded_with_authenticated_customer_identity(client, monkeypatch):
    def handler(request):
        assert request.method == "POST"
        assert request.url.path == "/api/fulfillment/orders/8/cancel"
        assert request.headers["x-customer-id"] == "customer-one"
        return httpx.Response(200, json={"id": 8, "stage": "canceled", "stock_reserved": False})

    mock_upstream(monkeypatch, handler)
    result = client.post("/api/fulfillment/orders/8/cancel", headers={"X-Customer-Id": "someone-else"})
    assert result.status_code == 200
    assert result.json() == {"id": 8, "stage": "canceled", "stock_reserved": False}


def test_creation_forwards_verified_customer_contact(client, monkeypatch):
    import json
    def handler(request):
        payload = json.loads(request.read())
        assert payload["customer_contact"] == "customer@example.com"
        assert payload["method"] == "customer_pickup"
        return httpx.Response(200, json={"id": 3, "stage": "requested"})
    mock_upstream(monkeypatch, handler)
    result = client.post("/api/fulfillment/orders", json={
        "restaurant_name": "Kitchen", "produce_type": "Tomato", "quantity_needed": 3, "unit": "kg",
        "method": "customer_pickup", "delivery_window_start": "2026-11-01T10:00:00Z",
        "delivery_window_end": "2026-11-01T12:00:00Z", "customer_contact": "spoofed",
    })
    assert result.status_code == 200


def test_creation_links_listing_to_owned_kitchen_ingredient(client, monkeypatch):
    with client.app.state.test_sessions() as db:
        item = InventoryItem(
            user_id="customer@example.com",
            ingredient_name="tomatoes",
            quantity="1",
            reorder_point="2",
            unit="kg",
        )
        db.add(item)
        db.commit()
        item_id = item.id

    def handler(request):
        import json
        payload = json.loads(request.read())
        assert payload["produce_inventory_id"] == 12
        assert payload["menurithm_inventory_item_id"] == item_id
        assert payload["customer_contact"] == "customer@example.com"
        return httpx.Response(200, json={"id": 5, "menurithm_inventory_item_id": item_id})
    mock_upstream(monkeypatch, handler)
    result = client.post("/api/fulfillment/orders", json={
        "restaurant_name": "Kitchen", "produce_type": "Tomato", "quantity_needed": 3,
        "unit": "kg", "method": "customer_pickup",
        "delivery_window_start": "2026-11-01T10:00:00Z",
        "delivery_window_end": "2026-11-01T12:00:00Z",
        "produce_inventory_id": 12, "inventory_item_id": item_id,
    })
    assert result.status_code == 200, result.text


def test_creation_rejects_another_users_inventory_link(client, monkeypatch):
    with client.app.state.test_sessions() as db:
        item = InventoryItem(
            user_id="other@example.com",
            ingredient_name="tomatoes",
            quantity="1",
            unit="kg",
        )
        db.add(item)
        db.commit()
        item_id = item.id
    result = client.post("/api/fulfillment/orders", json={
        "restaurant_name": "Kitchen", "produce_type": "Tomato", "quantity_needed": 3,
        "unit": "kg", "method": "customer_pickup",
        "delivery_window_start": "2026-11-01T10:00:00Z",
        "delivery_window_end": "2026-11-01T12:00:00Z",
        "inventory_item_id": item_id,
    })
    assert result.status_code == 404


def test_available_produce_filters_are_forwarded_to_croprithm(client, monkeypatch):
    def handler(request):
        assert request.url.path == "/api/fulfillment/produce/available"
        assert request.url.params["produce_type"] == "tomato & pepper"
        assert request.url.params["location"] == "North Farm"
        assert request.url.params["max_price"] == "2.5"
        return httpx.Response(200, json=[{"id": 4, "seller_name": "Farmer"}])
    mock_upstream(monkeypatch, handler)
    result = client.get(
        "/api/fulfillment/produce/available",
        params={"produce_type": "tomato & pepper", "location": "North Farm", "max_price": 2.5},
    )
    assert result.status_code == 200
    assert result.json()[0]["seller_name"] == "Farmer"


def test_confirmed_receipt_updates_inventory_once(client, monkeypatch):
    with client.app.state.test_sessions() as db:
        item = InventoryItem(
            user_id="customer@example.com",
            ingredient_name="tomatoes",
            quantity="1",
            reorder_point="2",
            unit="kg",
        )
        db.add(item)
        db.commit()
        item_id = item.id

    def handler(request):
        assert request.url.path == "/api/fulfillment/orders"
        return httpx.Response(200, json=[{
            "id": 15,
            "stage": "delivered",
            "menurithm_inventory_item_id": item_id,
        }])
    mock_upstream(monkeypatch, handler)

    result = client.post(
        "/api/fulfillment/orders/15/receive",
        json={"quantity_received": "500", "unit": "g"},
    )
    assert result.status_code == 200, result.text
    assert result.json()["status"] == "received"

    duplicate = client.post(
        "/api/fulfillment/orders/15/receive",
        json={"quantity_received": "3", "unit": "kg"},
    )
    assert duplicate.status_code == 200, duplicate.text
    assert duplicate.json()["status"] == "already_received"

    with client.app.state.test_sessions() as db:
        stock = db.query(InventoryItem).filter(InventoryItem.id == item_id).one()
        movements = db.query(InventoryMovement).filter(
            InventoryMovement.external_reference == "croprithm-order:15",
        ).all()
        assert stock.quantity == "1.5"
        assert len(movements) == 1


def test_receipt_requires_fulfilled_order_and_inventory_link(client, monkeypatch):
    def handler(request):
        return httpx.Response(200, json=[{"id": 15, "stage": "quoted"}])
    mock_upstream(monkeypatch, handler)
    response = client.post(
        "/api/fulfillment/orders/15/receive",
        json={"quantity_received": "1", "unit": "kg"},
    )
    assert response.status_code == 409


def test_receipt_document_uses_confirmed_inventory_movement(client, monkeypatch):
    with client.app.state.test_sessions() as db:
        item = InventoryItem(
            user_id="customer@example.com",
            ingredient_name="tomatoes",
            quantity="4.5",
            unit="kg",
        )
        db.add(item)
        db.flush()
        db.add(InventoryMovement(
            user_id="customer@example.com",
            inventory_item_id=item.id,
            external_reference="croprithm-order:22",
            movement_type="produce_receipt",
            quantity_change="2.5",
            quantity_before="2",
            quantity_after="4.5",
            unit="kg",
            reason="Confirmed receipt of Croprithm order #22",
        ))
        db.commit()

    def handler(request):
        return httpx.Response(200, json=[{
            "id": 22,
            "request_id": 17,
            "stage": "delivered",
            "restaurant_name": "Pilot Kitchen",
            "produce_type": "Tomato",
            "method": "farmer_delivery",
            "farmer_name": "Farmer One",
            "farmer_contact": "farmer@example.com",
        }])
    mock_upstream(monkeypatch, handler)

    result = client.get("/api/fulfillment/orders/22/receipt")
    assert result.status_code == 200
    assert result.json()["receipt_number"].startswith("MEN-RCV-")
    assert result.json()["quantity_received"] == "2.5"
    assert result.json()["stock_after"] == "4.5"
    assert result.json()["farmer_name"] == "Farmer One"
    assert "not proof of purchase or payment" in result.json()["notice"]


def test_receipt_document_requires_confirmed_receipt(client, monkeypatch):
    mock_upstream(monkeypatch, lambda _: httpx.Response(200, json=[{"id": 23}]))
    result = client.get("/api/fulfillment/orders/23/receipt")
    assert result.status_code == 404


def test_unconfigured_and_unavailable_bridge_fail_explicitly(client, monkeypatch):
    monkeypatch.delenv("FULFILLMENT_BRIDGE_KEY")
    assert client.get("/api/fulfillment/orders").status_code == 503
    monkeypatch.setenv("FULFILLMENT_BRIDGE_KEY", "test-only")
    mock_upstream(monkeypatch, lambda _: httpx.Response(503, text="Not ready"))
    assert client.get("/api/fulfillment/orders").status_code == 502
    def timeout(request):
        raise httpx.ConnectTimeout("Timed out", request=request)
    mock_upstream(monkeypatch, timeout)
    assert client.get("/api/fulfillment/orders").status_code == 502


def test_orders_require_authenticated_menurithm_user(monkeypatch):
    app = FastAPI()
    app.include_router(fulfillment.router)
    with TestClient(app) as client:
        assert client.get("/api/fulfillment/orders").status_code in [401, 403]
