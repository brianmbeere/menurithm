import os
from types import SimpleNamespace
from unittest.mock import patch

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
ASYNC_CLIENT = httpx.AsyncClient

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
with patch("firebase_admin.credentials.Certificate"), patch("firebase_admin.initialize_app"):
    from app.routes import fulfillment


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("FULFILLMENT_BRIDGE_KEY", "test-only-bridge")
    monkeypatch.setenv("CROPRITHM_BASE_URL", "https://api.croprithm.com/api/v1")
    app = FastAPI()
    app.include_router(fulfillment.router)
    app.dependency_overrides[fulfillment.get_current_user] = lambda: SimpleNamespace(
        firebase_uid="customer-one", email="customer@example.com"
    )
    with TestClient(app) as client:
        yield client


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
    assert result.json() == [{"id": 1, "stage": "quoted"}]


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
