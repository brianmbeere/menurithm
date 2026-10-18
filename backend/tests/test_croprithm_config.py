import pytest

from app.core.croprithm_config import (
    DEFAULT_CROPRITHM_URL,
    get_croprithm_api_key,
    get_croprithm_base_url,
)


@pytest.fixture(autouse=True)
def clear_integration_settings(monkeypatch):
    for key in (
        "CROPRITHM_API_KEY", "CROPRITHM_BASE_URL",
        "ROUTECAST_API_KEY", "ROUTECAST_BASE_URL",
        "DB_NAME",
    ):
        monkeypatch.delenv(key, raising=False)


def test_default_points_to_croprithm():
    assert get_croprithm_base_url() == DEFAULT_CROPRITHM_URL
    assert get_croprithm_api_key() is None


def test_legacy_configuration_still_works(monkeypatch):
    monkeypatch.setenv("ROUTECAST_API_KEY", "legacy-key")
    monkeypatch.setenv("ROUTECAST_BASE_URL", "https://legacy.example/api/")
    assert get_croprithm_api_key() == "legacy-key"
    assert get_croprithm_base_url() == "https://legacy.example/api"


def test_new_settings_take_precedence(monkeypatch):
    monkeypatch.setenv("ROUTECAST_API_KEY", "legacy-key")
    monkeypatch.setenv("ROUTECAST_BASE_URL", "https://legacy.example/api")
    monkeypatch.setenv("CROPRITHM_API_KEY", "new-key")
    monkeypatch.setenv("CROPRITHM_BASE_URL", "https://new.example/api/")
    assert get_croprithm_api_key() == "new-key"
    assert get_croprithm_base_url() == "https://new.example/api"


def test_explicitly_disabled_key_does_not_fall_back(monkeypatch):
    monkeypatch.setenv("ROUTECAST_API_KEY", "legacy-key")
    monkeypatch.setenv("CROPRITHM_API_KEY", "")
    assert get_croprithm_api_key() == ""


def test_empty_new_url_fails(monkeypatch):
    monkeypatch.setenv("CROPRITHM_BASE_URL", " ")
    with pytest.raises(ValueError, match="CROPRITHM_BASE_URL"):
        get_croprithm_base_url()


def test_old_service_import_is_compatible(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    from app.services.croprithm_integration import CroprithmIntegrationService
    from app.services.routecast_integration import RouteCastIntegrationService

    assert RouteCastIntegrationService is CroprithmIntegrationService
    service = CroprithmIntegrationService(None, "test-key")
    assert service.base_url == DEFAULT_CROPRITHM_URL
    assert not service._is_demo_mode()


@pytest.mark.parametrize("key", [
    "your-routecast-api-key-here", "your-croprithm-api-key-here",
])
def test_both_placeholder_keys_remain_demo_mode(monkeypatch, key):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    from app.services.croprithm_integration import CroprithmIntegrationService

    assert CroprithmIntegrationService(None, key)._is_demo_mode()
