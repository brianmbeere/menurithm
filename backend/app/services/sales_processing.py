from datetime import datetime
from decimal import Decimal, InvalidOperation

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.dish import Dish
from app.models.inventory import InventoryItem
from app.models.inventory_movement import InventoryMovement
from app.models.sales import Sale
from app.services.unit_conversion import (
    UnitConversionError,
    convert_quantity,
    decimal_string,
    decimal_value,
)


class SaleProcessingError(ValueError):
    pass


def _sale_matches(
    sale: Sale,
    dish_id: int,
    timestamp: datetime,
    quantity_sold: int,
    price_per_unit: float,
) -> bool:
    return (
        sale.dish_id == dish_id
        and sale.timestamp == timestamp
        and sale.quantity_sold == quantity_sold
        and sale.price_per_unit == price_per_unit
    )


def _existing_sale(
    db: Session,
    user_id: str,
    idempotency_key: str | None,
    csv_upload_hash: str | None,
    csv_row_number: int | None,
) -> Sale | None:
    if idempotency_key:
        return db.query(Sale).filter(
            Sale.user_id == user_id,
            Sale.idempotency_key == idempotency_key,
        ).options(joinedload(Sale.dish)).first()
    if csv_upload_hash is not None and csv_row_number is not None:
        return db.query(Sale).filter(
            Sale.user_id == user_id,
            Sale.csv_upload_hash == csv_upload_hash,
            Sale.csv_row_number == csv_row_number,
        ).options(joinedload(Sale.dish)).first()
    return None


def _deduct_recipe(db: Session, sale: Sale, dish: Dish) -> None:
    if not dish.recipe_yield or dish.recipe_yield <= 0:
        raise SaleProcessingError(
            "Recipe yield is not set. Edit this dish and confirm how many servings "
            "the saved ingredient quantities make."
        )
    if not dish.ingredients:
        raise SaleProcessingError("This dish has no recipe ingredients configured.")

    requirements_by_item: dict[int, tuple[InventoryItem, Decimal, Decimal]] = {}
    for recipe_ingredient in sorted(dish.ingredients, key=lambda item: item.ingredient_id):
        if recipe_ingredient.quantity_decimal is None:
            raise SaleProcessingError(
                "A recipe ingredient has no verified decimal quantity. Edit and save "
                "the recipe quantities before recording deductions."
            )
        try:
            recipe_quantity = decimal_value(
                recipe_ingredient.quantity_decimal, "Recipe ingredient quantity"
            )
        except ValueError as exc:
            raise SaleProcessingError(str(exc)) from exc
        if recipe_quantity <= 0:
            raise SaleProcessingError("Recipe ingredient quantities must be positive.")
        stock = db.query(InventoryItem).filter(
            InventoryItem.id == recipe_ingredient.ingredient_id,
            InventoryItem.user_id == sale.user_id,
        ).with_for_update().first()
        if stock is None:
            raise SaleProcessingError(
                f"Ingredient {recipe_ingredient.ingredient_id} is missing from this "
                "restaurant's inventory."
            )
        if not recipe_ingredient.unit or not stock.unit:
            raise SaleProcessingError(
                f"Set units for {stock.ingredient_name} in both the recipe and inventory."
            )
        try:
            per_serving = recipe_quantity / Decimal(dish.recipe_yield)
            required = convert_quantity(
                per_serving * Decimal(sale.quantity_sold),
                recipe_ingredient.unit,
                stock.unit,
            )
            available = decimal_value(stock.quantity, f"{stock.ingredient_name} stock")
        except (ValueError, InvalidOperation, UnitConversionError) as exc:
            raise SaleProcessingError(str(exc)) from exc
        if recipe_ingredient.ingredient_id in requirements_by_item:
            prior_stock, prior_required, prior_available = requirements_by_item[recipe_ingredient.ingredient_id]
            available = prior_available
            required += prior_required
            stock = prior_stock
        if required > available:
            raise SaleProcessingError(
                f"Insufficient {stock.ingredient_name}: {available} {stock.unit} "
                f"available, {required} {stock.unit} required."
            )
        requirements_by_item[stock.id] = (stock, required, available)

    for stock, required, available in requirements_by_item.values():
        remaining = available - required
        stock.quantity = decimal_string(remaining)
        db.add(InventoryMovement(
            user_id=sale.user_id,
            inventory_item_id=stock.id,
            sale_id=sale.id,
            processing_version=sale.processing_version,
            movement_type="sale_consumption",
            quantity_change=decimal_string(-required),
            quantity_before=decimal_string(available),
            quantity_after=decimal_string(remaining),
            unit=stock.unit,
            reason=f"Sale of {sale.quantity_sold} servings of {dish.name}",
        ))


def record_sale(
    db: Session,
    *,
    user_id: str,
    dish_name: str,
    timestamp: datetime,
    quantity_sold: int,
    price_per_unit: float,
    idempotency_key: str | None = None,
    csv_upload_hash: str | None = None,
    csv_row_number: int | None = None,
) -> tuple[Sale, bool]:
    existing = _existing_sale(
        db, user_id, idempotency_key, csv_upload_hash, csv_row_number
    )
    dish = db.query(Dish).filter(
        Dish.name == dish_name,
        Dish.user_id == user_id,
    ).with_for_update().first()
    if not dish:
        raise SaleProcessingError(f"Dish {dish_name!r} was not found.")
    if existing:
        if not _sale_matches(existing, dish.id, timestamp, quantity_sold, price_per_unit):
            raise SaleProcessingError(
                "This idempotency key or CSV row was already used for a different sale."
            )
        return existing, True
    if quantity_sold <= 0:
        raise SaleProcessingError("Quantity sold must be greater than zero.")

    sale = Sale(
        user_id=user_id,
        dish_id=dish.id,
        timestamp=timestamp,
        quantity_sold=quantity_sold,
        price_per_unit=price_per_unit,
        processing_status="pending",
        idempotency_key=idempotency_key,
        csv_upload_hash=csv_upload_hash,
        csv_row_number=csv_row_number,
        processing_version=1,
    )
    try:
        with db.begin_nested():
            db.add(sale)
            db.flush()
    except IntegrityError as exc:
        existing = _existing_sale(
            db, user_id, idempotency_key, csv_upload_hash, csv_row_number
        )
        if existing is None:
            raise
        if not _sale_matches(existing, dish.id, timestamp, quantity_sold, price_per_unit):
            raise SaleProcessingError(
                "This idempotency key or CSV row was already used for a different sale."
            ) from exc
        return existing, True

    try:
        with db.begin_nested():
            _deduct_recipe(db, sale, dish)
    except SaleProcessingError as exc:
        sale.processing_status = "needs_attention"
        sale.processing_error = str(exc)
        sale.processed_at = None
    else:
        sale.processing_status = "processed"
        sale.processing_error = None
        sale.processed_at = datetime.utcnow()
    db.flush()
    return sale, False


def _reverse_sale_movements(
    db: Session,
    sale: Sale,
    movement_type: str,
    reason: str,
) -> None:
    previous_movements = db.query(InventoryMovement).filter(
        InventoryMovement.sale_id == sale.id,
        InventoryMovement.processing_version == sale.processing_version,
        InventoryMovement.movement_type == "sale_consumption",
        InventoryMovement.user_id == sale.user_id,
    ).order_by(InventoryMovement.inventory_item_id).all()
    for previous in previous_movements:
        stock = db.query(InventoryItem).filter(
            InventoryItem.id == previous.inventory_item_id,
            InventoryItem.user_id == sale.user_id,
        ).with_for_update().first()
        if stock is None:
            raise SaleProcessingError("Cannot reverse sale: an inventory item is missing.")
        before = decimal_value(stock.quantity, f"{stock.ingredient_name} stock")
        restored = decimal_value(previous.quantity_change, "Previous sale movement") * -1
        after = before + restored
        stock.quantity = decimal_string(after)
        db.add(InventoryMovement(
            user_id=sale.user_id,
            inventory_item_id=stock.id,
            sale_id=sale.id,
            processing_version=sale.processing_version,
            movement_type=movement_type,
            quantity_change=decimal_string(restored),
            quantity_before=decimal_string(before),
            quantity_after=decimal_string(after),
            unit=stock.unit,
            reason=reason,
        ))


def correct_sale(
    db: Session,
    *,
    sale: Sale,
    dish_name: str,
    timestamp: datetime,
    quantity_sold: int,
    price_per_unit: float,
) -> Sale:
    dish = db.query(Dish).filter(
        Dish.name == dish_name,
        Dish.user_id == sale.user_id,
    ).with_for_update().first()
    if dish is None:
        raise SaleProcessingError(f"Dish {dish_name!r} was not found.")
    if quantity_sold <= 0:
        raise SaleProcessingError("Quantity sold must be greater than zero.")
    if sale.processing_status == "canceled":
        raise SaleProcessingError("A canceled sale cannot be edited.")

    try:
        with db.begin_nested():
            _reverse_sale_movements(
                db,
                sale,
                "sale_correction_reversal",
                "Reverse previous sale while correcting sale",
            )
    except SaleProcessingError:
        raise

    sale.dish_id = dish.id
    sale.timestamp = timestamp
    sale.quantity_sold = quantity_sold
    sale.price_per_unit = price_per_unit
    sale.processing_version += 1
    sale.processing_status = "pending"
    sale.processing_error = None
    sale.processed_at = None
    db.flush()
    try:
        with db.begin_nested():
            _deduct_recipe(db, sale, dish)
    except SaleProcessingError as exc:
        sale.processing_status = "needs_attention"
        sale.processing_error = str(exc)
    else:
        sale.processing_status = "processed"
        sale.processed_at = datetime.utcnow()
    db.flush()
    return sale


def cancel_sale(db: Session, sale: Sale) -> Sale:
    if sale.processing_status == "canceled":
        return sale
    try:
        with db.begin_nested():
            _reverse_sale_movements(
                db,
                sale,
                "sale_cancellation_reversal",
                "Reverse sale after cancellation",
            )
    except SaleProcessingError:
        raise
    sale.processing_status = "canceled"
    sale.processing_error = None
    sale.processed_at = None
    db.flush()
    return sale
