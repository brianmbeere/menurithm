from decimal import Decimal, InvalidOperation


_UNIT_FACTORS = {
    "mg": ("mass", Decimal("0.001")),
    "g": ("mass", Decimal("1")),
    "gram": ("mass", Decimal("1")),
    "grams": ("mass", Decimal("1")),
    "kg": ("mass", Decimal("1000")),
    "kilogram": ("mass", Decimal("1000")),
    "kilograms": ("mass", Decimal("1000")),
    "oz": ("mass", Decimal("28.349523125")),
    "ounce": ("mass", Decimal("28.349523125")),
    "ounces": ("mass", Decimal("28.349523125")),
    "lb": ("mass", Decimal("453.59237")),
    "lbs": ("mass", Decimal("453.59237")),
    "pound": ("mass", Decimal("453.59237")),
    "pounds": ("mass", Decimal("453.59237")),
    "ml": ("volume", Decimal("1")),
    "milliliter": ("volume", Decimal("1")),
    "milliliters": ("volume", Decimal("1")),
    "l": ("volume", Decimal("1000")),
    "liter": ("volume", Decimal("1000")),
    "liters": ("volume", Decimal("1000")),
    "litre": ("volume", Decimal("1000")),
    "litres": ("volume", Decimal("1000")),
    "kilograms (kg)": ("mass", Decimal("1000")),
    "pounds (lb)": ("mass", Decimal("453.59237")),
    "liters (l)": ("volume", Decimal("1000")),
    "liters (L)": ("volume", Decimal("1000")),
}


class UnitConversionError(ValueError):
    pass


def convert_quantity(quantity: Decimal, source_unit: str, target_unit: str) -> Decimal:
    source = source_unit.strip().lower()
    target = target_unit.strip().lower()
    if source == target:
        return quantity

    source_info = _UNIT_FACTORS.get(source)
    target_info = _UNIT_FACTORS.get(target)
    if not source_info or not target_info or source_info[0] != target_info[0]:
        raise UnitConversionError(
            f"Cannot convert {source_unit!r} to {target_unit!r}; use compatible units."
        )
    return quantity * source_info[1] / target_info[1]


def decimal_value(value: object, label: str) -> Decimal:
    try:
        result = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(f"{label} must be a valid decimal quantity.") from exc
    if not result.is_finite():
        raise ValueError(f"{label} must be finite.")
    return result


def decimal_string(value: Decimal) -> str:
    return format(value.normalize(), "f") if value else "0"
