import csv
import io
from datetime import datetime
from typing import Dict, List, Any
from fastapi import APIRouter, File, UploadFile, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.models.inventory import InventoryItem
from app.models.dish import Dish
from app.utils.auth import get_current_user

router = APIRouter()

def validate_csv_structure(file_content: str, expected_columns: List[str]) -> Dict[str, Any]:
    """Validate basic CSV structure and columns."""
    try:
        csv_reader = csv.DictReader(io.StringIO(file_content))
        actual_columns = csv_reader.fieldnames or []
        
        missing_columns = [col for col in expected_columns if col not in actual_columns]
        extra_columns = [col for col in actual_columns if col not in expected_columns]
        
        # Count rows
        rows = list(csv_reader)
        row_count = len(rows)
        
        return {
            "valid_structure": len(missing_columns) == 0,
            "expected_columns": expected_columns,
            "actual_columns": actual_columns,
            "missing_columns": missing_columns,
            "extra_columns": extra_columns,
            "row_count": row_count,
            "sample_row": rows[0] if rows else None
        }
    except Exception as e:
        return {
            "valid_structure": False,
            "error": f"Failed to parse CSV: {str(e)}"
        }

def validate_inventory_data(rows: List[Dict], user_email: str) -> Dict[str, Any]:
    """Validate inventory-specific data."""
    errors = []
    warnings = []
    valid_rows = 0
    
    for row_num, row in enumerate(rows, 1):
        row_errors = []
        
        # Check required fields
        if not row.get("ingredient_name", "").strip():
            row_errors.append("ingredient_name is required")
        
        if not row.get("quantity", "").strip():
            row_errors.append("quantity is required")
            
        if not row.get("unit", "").strip():
            row_errors.append("unit is required")
        
        # Validate date format
        if row.get("expiry_date"):
            try:
                datetime.strptime(row["expiry_date"], "%Y-%m-%d")
            except ValueError:
                row_errors.append("expiry_date must be in YYYY-MM-DD format")
        
        if row_errors:
            errors.append(f"Row {row_num}: {', '.join(row_errors)}")
        else:
            valid_rows += 1
    
    return {
        "valid_data": len(errors) == 0,
        "valid_rows": valid_rows,
        "total_rows": len(rows),
        "errors": errors,
        "warnings": warnings
    }

def validate_dishes_data(rows: List[Dict], user_email: str, db: Session) -> Dict[str, Any]:
    """Validate dishes-specific data."""
    errors = []
    warnings = []
    valid_rows = 0
    
    # Get user's inventory for validation
    user_ingredients = {
        item.ingredient_name.lower(): item 
        for item in db.query(InventoryItem).filter(InventoryItem.user_id == user_email).all()
    }
    
    for row_num, row in enumerate(rows, 1):
        row_errors = []
        
        # Check required fields
        if not row.get("dish_name", "").strip():
            row_errors.append("dish_name is required")
        
        if not row.get("ingredient_name", "").strip():
            row_errors.append("ingredient_name is required")
        else:
            # Check if ingredient exists in user's inventory
            ingredient_name = row["ingredient_name"].strip().lower()
            if ingredient_name not in user_ingredients:
                row_errors.append(f"ingredient '{ingredient_name}' not found in your inventory")
        
        # Validate quantity
        if not row.get("quantity"):
            row_errors.append("quantity is required")
        else:
            try:
                float(row["quantity"])
            except ValueError:
                row_errors.append("quantity must be a valid number")
        
        if not row.get("unit", "").strip():
            row_errors.append("unit is required")
        
        if row_errors:
            errors.append(f"Row {row_num}: {', '.join(row_errors)}")
        else:
            valid_rows += 1
    
    return {
        "valid_data": len(errors) == 0,
        "valid_rows": valid_rows,
        "total_rows": len(rows),
        "errors": errors,
        "warnings": warnings,
        "available_ingredients": list(user_ingredients.keys())
    }

def validate_sales_data(rows: List[Dict], user_email: str, db: Session) -> Dict[str, Any]:
    """Validate sales-specific data."""
    errors = []
    warnings = []
    valid_rows = 0
    
    # Get user's dishes for validation
    user_dishes = {
        dish.name: dish 
        for dish in db.query(Dish).filter(Dish.user_id == user_email).all()
    }
    
    for row_num, row in enumerate(rows, 1):
        row_errors = []
        
        # Check required fields
        if not row.get("dish_name", "").strip():
            row_errors.append("dish_name is required")
        else:
            # Check if dish exists
            dish_name = row["dish_name"].strip()
            if dish_name not in user_dishes:
                row_errors.append(f"dish '{dish_name}' not found in your dishes")
        
        # Validate date
        if not row.get("date"):
            row_errors.append("date is required")
        else:
            try:
                datetime.strptime(row["date"], "%Y-%m-%d")
            except ValueError:
                row_errors.append("date must be in YYYY-MM-DD format")
        
        # Validate quantity_sold
        if not row.get("quantity_sold"):
            row_errors.append("quantity_sold is required")
        else:
            try:
                int(row["quantity_sold"])
            except ValueError:
                row_errors.append("quantity_sold must be a whole number")
        
        # Validate price_per_unit
        if not row.get("price_per_unit"):
            row_errors.append("price_per_unit is required")
        else:
            try:
                float(row["price_per_unit"])
            except ValueError:
                row_errors.append("price_per_unit must be a valid number")
        
        if row_errors:
            errors.append(f"Row {row_num}: {', '.join(row_errors)}")
        else:
            valid_rows += 1
    
    return {
        "valid_data": len(errors) == 0,
        "valid_rows": valid_rows,
        "total_rows": len(rows),
        "errors": errors,
        "warnings": warnings,
        "available_dishes": list(user_dishes.keys())
    }

@router.post("/validate-csv/{upload_type}")
async def validate_csv_upload(
    upload_type: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validate a CSV file before actual upload.
    This endpoint checks file structure, column headers, data types,
    and business rules without making any database changes.
    """
    
    if upload_type not in ["inventory", "dishes", "sales"]:
        return {"error": f"Invalid upload type: {upload_type}"}
    
    # Read file content
    try:
        contents = await file.read()
        decoded = contents.decode("utf-8")
    except Exception as e:
        return {"error": f"Failed to read file: {str(e)}"}
    
    # Define expected columns for each type
    expected_columns = {
        "inventory": ["ingredient_name", "quantity", "unit", "category", "expiry_date", "storage_location"],
        "dishes": ["dish_name", "description", "ingredient_name", "quantity", "unit"],
        "sales": ["dish_name", "date", "quantity_sold", "price_per_unit"]
    }
    
    # Validate structure
    structure_validation = validate_csv_structure(decoded, expected_columns[upload_type])
    
    if not structure_validation["valid_structure"]:
        return {
            "valid": False,
            "upload_type": upload_type,
            "structure_validation": structure_validation,
            "recommendation": f"Please ensure your CSV has these exact columns: {', '.join(expected_columns[upload_type])}"
        }
    
    # Parse rows for data validation
    try:
        csv_reader = csv.DictReader(io.StringIO(decoded))
        rows = list(csv_reader)
    except Exception as e:
        return {"error": f"Failed to parse CSV data: {str(e)}"}
    
    # Validate data based on type
    if upload_type == "inventory":
        data_validation = validate_inventory_data(rows, user.email)
    elif upload_type == "dishes":
        data_validation = validate_dishes_data(rows, user.email, db)
    elif upload_type == "sales":
        data_validation = validate_sales_data(rows, user.email, db)
    
    # Compile final result
    is_valid = structure_validation["valid_structure"] and data_validation["valid_data"]
    
    result = {
        "valid": is_valid,
        "upload_type": upload_type,
        "file_name": file.filename,
        "structure_validation": structure_validation,
        "data_validation": data_validation,
        "ready_for_upload": is_valid
    }
    
    if is_valid:
        result["message"] = f"✅ Your {upload_type} CSV file is valid and ready for upload!"
    else:
        result["message"] = f"❌ Your {upload_type} CSV file has validation errors. Please fix them before uploading."
    
    return result
