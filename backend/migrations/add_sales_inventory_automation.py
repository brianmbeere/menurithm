#!/usr/bin/env python3
"""Additive schema migration for recipe-backed sale deductions and history."""

import logging

from sqlalchemy import Index, inspect, text

from app.db.database import engine
from app.models.inventory_movement import InventoryMovement
from app.models.sales import Sale

logger = logging.getLogger(__name__)

_COLUMNS = {
    "dishes": {
        "recipe_yield": "NUMERIC(24, 9)",
    },
    "dish_ingredients": {
        "quantity_decimal": "NUMERIC(24, 9)",
    },
    "inventory": {
        "reorder_point": "VARCHAR(100) NOT NULL DEFAULT '0'",
    },
    "sales": {
        "processing_status": "VARCHAR(32) NOT NULL DEFAULT 'legacy'",
        "processing_error": "TEXT",
        "processed_at": "TIMESTAMP",
        "processing_version": "INTEGER NOT NULL DEFAULT 1",
        "idempotency_key": "VARCHAR(128)",
        "csv_upload_hash": "VARCHAR(64)",
        "csv_row_number": "INTEGER",
    },
}


def migrate() -> None:
    processing_status_added = False
    with engine.begin() as connection:
        inspector = inspect(connection)
        existing_tables = set(inspector.get_table_names())
        missing_tables = set(_COLUMNS) - existing_tables
        if missing_tables:
            raise RuntimeError(
                "Required tables are missing; start from an initialized Menurithm "
                f"database first: {', '.join(sorted(missing_tables))}"
            )

        for table_name, columns in _COLUMNS.items():
            existing_columns = {
                column["name"] for column in inspect(connection).get_columns(table_name)
            }
            for column_name, type_sql in columns.items():
                if column_name not in existing_columns:
                    connection.execute(text(
                        f"ALTER TABLE {table_name} ADD COLUMN {column_name} {type_sql}"
                    ))
                    if table_name == "sales" and column_name == "processing_status":
                        processing_status_added = True

        if processing_status_added:
            connection.execute(text(
                "UPDATE sales SET processing_error = "
                "'Historical sale predates recipe-based inventory tracking; "
                "no inventory deduction was recorded.' "
                "WHERE processing_status = 'legacy'"
            ))

        InventoryMovement.__table__.create(bind=connection, checkfirst=True)
        movement_columns = {
            column["name"]
            for column in inspect(connection).get_columns("inventory_movements")
        }
        if "external_reference" not in movement_columns:
            connection.execute(text(
                "ALTER TABLE inventory_movements ADD COLUMN external_reference VARCHAR(128)"
            ))
        Index(
            "uq_inventory_movement_external_receipt",
            InventoryMovement.user_id,
            InventoryMovement.external_reference,
            InventoryMovement.inventory_item_id,
            InventoryMovement.movement_type,
            unique=True,
        ).create(bind=connection, checkfirst=True)
        Index(
            "uq_sale_user_idempotency",
            Sale.user_id,
            Sale.idempotency_key,
            unique=True,
        ).create(bind=connection, checkfirst=True)
        Index(
            "uq_sale_csv_source",
            Sale.user_id,
            Sale.csv_upload_hash,
            Sale.csv_row_number,
            unique=True,
        ).create(bind=connection, checkfirst=True)
    logger.info("Sales and inventory automation schema is up to date.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    migrate()
