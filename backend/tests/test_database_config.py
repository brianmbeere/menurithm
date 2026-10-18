import logging
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine, text

from app.core.database_config import create_database_engine, get_database_url
from app.db import migrate_database


@pytest.fixture(autouse=True)
def database_environment(monkeypatch):
    for name in (
        "DB_NAME", "DB_POOL_SIZE", "DB_MAX_OVERFLOW",
        "DB_POOL_TIMEOUT", "DB_POOL_RECYCLE",
    ):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://pilot:p%40ss%2Fword@localhost:5432/original?sslmode=require",
    )


def test_database_override_preserves_connection_details(monkeypatch):
    original = get_database_url()
    monkeypatch.setenv("DB_NAME", "menurithm_pilot")
    url = get_database_url()
    assert url == original.set(database="menurithm_pilot")
    assert url.password == "p@ss/word"
    assert url.query["sslmode"] == "require"


def test_separate_services_select_separate_databases(monkeypatch):
    monkeypatch.setenv("DB_NAME", "menurithm_pilot")
    first = get_database_url()
    monkeypatch.setenv("DB_NAME", "routecast_pilot")
    second = get_database_url()
    assert first.database != second.database
    assert first.set(database=second.database) == second


def test_url_only_and_legacy_postgres_scheme(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://pilot:password@localhost/api_one")
    url = get_database_url()
    assert url.drivername == "postgresql"
    assert url.database == "api_one"


def test_missing_url_fails(monkeypatch):
    monkeypatch.delenv("DATABASE_URL")
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        get_database_url()


@pytest.mark.parametrize("name", ["", "two words", "other/db", "MixedCase", "a" * 64])
def test_invalid_database_override_fails(monkeypatch, name):
    monkeypatch.setenv("DB_NAME", name)
    with pytest.raises(ValueError, match="DB_NAME"):
        get_database_url()


def test_query_database_cannot_override_db_name(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://localhost/base?dbname=wrong")
    monkeypatch.setenv("DB_NAME", "menurithm_pilot")
    with pytest.raises(ValueError, match="dbname"):
        get_database_url()


def test_postgres_pool_defaults():
    with patch("app.core.database_config.create_engine") as factory:
        create_database_engine()
    assert factory.call_args.kwargs == {
        "pool_size": 2,
        "max_overflow": 1,
        "pool_timeout": 30,
        "pool_recycle": 1800,
        "pool_pre_ping": True,
    }


def test_pool_configuration(monkeypatch):
    monkeypatch.setenv("DB_POOL_SIZE", "3")
    monkeypatch.setenv("DB_MAX_OVERFLOW", "0")
    monkeypatch.setenv("DB_POOL_TIMEOUT", "15")
    monkeypatch.setenv("DB_POOL_RECYCLE", "600")
    engine = create_database_engine()
    try:
        assert engine.pool.size() == 3
        assert engine.pool._max_overflow == 0
        assert engine.pool.timeout() == 15
        assert engine.pool._recycle == 600
        assert engine.pool._pre_ping is True
    finally:
        engine.dispose()


@pytest.mark.parametrize(
    "setting,value",
    [
        ("DB_POOL_SIZE", "0"),
        ("DB_POOL_SIZE", "invalid"),
        ("DB_MAX_OVERFLOW", "-1"),
        ("DB_POOL_TIMEOUT", "0"),
        ("DB_POOL_RECYCLE", "-1"),
    ],
)
def test_invalid_pool_settings_fail(monkeypatch, setting, value):
    monkeypatch.setenv(setting, value)
    with pytest.raises(ValueError, match=setting):
        create_database_engine()


def test_sqlite_behavior_preserved(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    engine = create_database_engine()
    try:
        with engine.connect() as connection:
            assert connection.execute(text("SELECT 1")).scalar_one() == 1
    finally:
        engine.dispose()
    monkeypatch.setenv("DB_NAME", "not_postgres")
    with pytest.raises(ValueError, match="PostgreSQL"):
        get_database_url()


def test_backup_instructions_target_override(monkeypatch, caplog):
    monkeypatch.setenv("DB_NAME", "menurithm_pilot")
    with caplog.at_level(logging.INFO):
        migrate_database.backup_database()
    assert "-d menurithm_pilot" in caplog.text
    assert "p@ss" not in caplog.text


def test_migration_uses_shared_engine():
    engine = create_engine("sqlite:///:memory:")
    with patch.object(
        migrate_database, "create_database_engine", return_value=engine
    ) as factory, patch.object(
        migrate_database, "check_existing_constraints",
        side_effect=RuntimeError("stop before SQL"),
    ), patch.object(engine, "dispose", wraps=engine.dispose) as dispose:
        with pytest.raises(RuntimeError, match="stop before SQL"):
            migrate_database.migrate_database()
    factory.assert_called_once_with()
    dispose.assert_called_once_with()
