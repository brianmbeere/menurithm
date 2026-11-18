import os
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
with patch("firebase_admin.credentials.Certificate"), patch("firebase_admin.initialize_app"):
    from app.db.database import Base
    from app.models.dish import Dish, DishIngredient
    from app.models.inventory import InventoryItem
    from app.models.inventory_movement import InventoryMovement
    from app.models.sales import Sale
    from app.routes.inventory import get_low_stock_inventory
    from app.services.sales_processing import (
        SaleProcessingError,
        cancel_sale,
        correct_sale,
        record_sale,
    )


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    Base.metadata.drop_all(engine)
    engine.dispose()


def create_recipe(db: Session, *, recipe_yield=Decimal("1")):
    user_id = "restaurant@example.com"
    items = {
        "Tomatoes": InventoryItem(
            user_id=user_id,
            ingredient_name="Tomatoes",
            quantity="10",
            unit="kilograms (kg)",
        ),
        "Onions": InventoryItem(
            user_id=user_id, ingredient_name="Onions", quantity="8", unit="kg"
        ),
        "Spinach": InventoryItem(
            user_id=user_id, ingredient_name="Spinach", quantity="6", unit="kg"
        ),
    }
    db.add_all(items.values())
    dish = Dish(user_id=user_id, name="Vegetable Stew", recipe_yield=recipe_yield)
    db.add(dish)
    db.flush()
    for name, quantity in (
        ("Tomatoes", Decimal("200")),
        ("Onions", Decimal("100")),
        ("Spinach", Decimal("150")),
    ):
        item = items[name]
        db.add(DishIngredient(
            user_id=user_id,
            dish_id=dish.id,
            ingredient_id=item.id,
            quantity=float(quantity),
            quantity_decimal=quantity,
            unit="g",
        ))
    db.commit()
    return user_id, dish, items


def record(db, user_id, *, quantity=10, key="request-1", dish_name="Vegetable Stew"):
    return record_sale(
        db,
        user_id=user_id,
        dish_name=dish_name,
        timestamp=datetime(2026, 11, 17, 12),
        quantity_sold=quantity,
        price_per_unit=12.5,
        idempotency_key=key,
    )


def test_ten_servings_deduct_precise_converted_quantities_once(db):
    user_id, _, items = create_recipe(db)
    sale, duplicate = record(db, user_id)
    db.commit()

    assert not duplicate
    assert sale.processing_status == "processed"
    assert {name: item.quantity for name, item in items.items()} == {
        "Tomatoes": "8",
        "Onions": "7",
        "Spinach": "4.5",
    }
    movements = db.query(InventoryMovement).filter(
        InventoryMovement.sale_id == sale.id,
        InventoryMovement.movement_type == "sale_consumption",
    ).all()
    assert len(movements) == 3
    assert {movement.quantity_change for movement in movements} == {"-2", "-1", "-1.5"}

    retry, duplicate = record(db, user_id)
    db.commit()
    assert duplicate
    assert retry.id == sale.id
    assert db.query(InventoryMovement).filter(InventoryMovement.sale_id == sale.id).count() == 3


def test_csv_source_retry_is_duplicate_safe(db):
    user_id, _, items = create_recipe(db)
    kwargs = {
        "user_id": user_id,
        "dish_name": "Vegetable Stew",
        "timestamp": datetime(2026, 11, 17),
        "quantity_sold": 1,
        "price_per_unit": 12.5,
        "csv_upload_hash": "a" * 64,
        "csv_row_number": 2,
    }
    sale, duplicate = record_sale(db, **kwargs)
    db.commit()
    retried, duplicate_retry = record_sale(db, **kwargs)
    db.commit()

    assert not duplicate
    assert duplicate_retry
    assert retried.id == sale.id
    assert items["Tomatoes"].quantity == "9.8"
    assert db.query(InventoryMovement).filter(InventoryMovement.sale_id == sale.id).count() == 3


def test_missing_recipe_yield_records_attention_without_deduction(db):
    user_id, _, items = create_recipe(db, recipe_yield=None)
    sale, _ = record(db, user_id)
    db.commit()

    assert sale.processing_status == "needs_attention"
    assert "recipe yield" in sale.processing_error.lower()
    assert items["Tomatoes"].quantity == "10"
    assert db.query(InventoryMovement).filter(InventoryMovement.sale_id == sale.id).count() == 0


def test_insufficient_stock_rolls_back_all_ingredient_deductions(db):
    user_id, _, items = create_recipe(db)
    items["Spinach"].quantity = "0.1"
    db.commit()

    sale, _ = record(db, user_id)
    db.commit()

    assert sale.processing_status == "needs_attention"
    assert "insufficient spinach" in sale.processing_error.lower()
    assert {name: item.quantity for name, item in items.items()} == {
        "Tomatoes": "10",
        "Onions": "8",
        "Spinach": "0.1",
    }
    assert db.query(InventoryMovement).filter(InventoryMovement.sale_id == sale.id).count() == 0


def test_incompatible_units_do_not_deduct_stock(db):
    user_id, dish, items = create_recipe(db)
    dish.ingredients[0].unit = "pieces"
    db.commit()

    sale, _ = record(db, user_id)
    db.commit()

    assert sale.processing_status == "needs_attention"
    assert "cannot convert" in sale.processing_error.lower()
    assert items["Tomatoes"].quantity == "10"
    assert db.query(InventoryMovement).filter(InventoryMovement.sale_id == sale.id).count() == 0


def test_cancel_and_correction_create_compensating_movements(db):
    user_id, _, items = create_recipe(db)
    sale, _ = record(db, user_id)
    db.commit()
    correct_sale(
        db,
        sale=sale,
        dish_name="Vegetable Stew",
        timestamp=sale.timestamp,
        quantity_sold=5,
        price_per_unit=sale.price_per_unit,
    )
    db.commit()

    assert sale.processing_status == "processed"
    assert sale.processing_version == 2
    assert items["Tomatoes"].quantity == "9"
    assert db.query(InventoryMovement).filter(
        InventoryMovement.sale_id == sale.id,
        InventoryMovement.movement_type == "sale_correction_reversal",
    ).count() == 3

    cancel_sale(db, sale)
    db.commit()
    cancel_sale(db, sale)
    db.commit()
    assert sale.processing_status == "canceled"
    assert items["Tomatoes"].quantity == "10"
    assert db.query(InventoryMovement).filter(
        InventoryMovement.sale_id == sale.id,
        InventoryMovement.movement_type == "sale_cancellation_reversal",
    ).count() == 3


def test_reused_idempotency_key_with_different_sale_is_rejected(db):
    user_id, _, _ = create_recipe(db)
    record(db, user_id)
    db.commit()
    with pytest.raises(SaleProcessingError, match="different sale"):
        record(db, user_id, quantity=9)


def test_low_stock_detection_uses_configured_decimal_reorder_point(db):
    user_id = "restaurant@example.com"
    low = InventoryItem(
        user_id=user_id, ingredient_name="Carrots",
        quantity="0.75", reorder_point="0.8", unit="kg",
    )
    above = InventoryItem(
        user_id=user_id, ingredient_name="Celery",
        quantity="0.801", reorder_point="0.8", unit="kg",
    )
    disabled = InventoryItem(
        user_id=user_id, ingredient_name="Potatoes",
        quantity="0", reorder_point="0", unit="kg",
    )
    db.add_all([low, above, disabled])
    db.commit()

    results = get_low_stock_inventory(db, SimpleNamespace(email=user_id))

    assert [item.ingredient_name for item in results] == ["Carrots"]
