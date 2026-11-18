import asyncio
import os
from unittest.mock import patch

import pytest
from fastapi import HTTPException

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
with patch("firebase_admin.credentials.Certificate"), patch("firebase_admin.initialize_app"):
    from app.services.croprithm_integration import CroprithmIntegrationService
    from app.services.enhanced_inventory_safety import (
        ENHANCED_INVENTORY_READ_ONLY_DETAIL,
        EnhancedInventoryReadOnlyError,
        reject_enhanced_inventory_write_http,
    )
    from app.services.voice_inventory import VoiceInventoryService


def test_http_write_guard_returns_gone():
    with pytest.raises(HTTPException) as error:
        reject_enhanced_inventory_write_http()
    assert error.value.status_code == 410
    assert error.value.detail == ENHANCED_INVENTORY_READ_ONLY_DETAIL


def test_voice_stock_service_rejects_direct_writes():
    service = VoiceInventoryService(db=None)
    with pytest.raises(EnhancedInventoryReadOnlyError):
        service._add_inventory(
            "restaurant@example.com",
            {"ingredient": "tomatoes", "quantity": 1, "unit": "kg"},
            "add 1 kg tomatoes",
            1.0,
        )
    with pytest.raises(EnhancedInventoryReadOnlyError):
        service._use_inventory(
            "restaurant@example.com",
            {"ingredient": "tomatoes", "quantity": 1, "unit": "kg"},
            "use 1 kg tomatoes",
            1.0,
        )


def test_legacy_delivery_service_rejects_direct_stock_updates():
    service = CroprithmIntegrationService(db=None, api_key="")
    with pytest.raises(EnhancedInventoryReadOnlyError):
        asyncio.run(
            service.process_delivery_confirmation(
                "restaurant@example.com", order_id=14, received_quantity=5
            )
        )
