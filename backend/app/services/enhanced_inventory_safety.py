from typing import NoReturn

from fastapi import HTTPException


ENHANCED_INVENTORY_READ_ONLY_DETAIL = (
    "Enhanced inventory is read-only while it remains separate from recipe-linked "
    "inventory. Update stock through the Inventory screen instead."
)


class EnhancedInventoryReadOnlyError(RuntimeError):
    pass


def reject_enhanced_inventory_write() -> NoReturn:
    raise EnhancedInventoryReadOnlyError(ENHANCED_INVENTORY_READ_ONLY_DETAIL)


def reject_enhanced_inventory_write_http() -> None:
    raise HTTPException(
        status_code=410,
        detail=ENHANCED_INVENTORY_READ_ONLY_DETAIL,
    )
