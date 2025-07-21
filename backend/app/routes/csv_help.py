from fastapi import APIRouter
from fastapi.responses import Response
from typing import Dict, List, Any

router = APIRouter()

@router.get("/csv-formats")
def get_csv_formats() -> Dict[str, Any]:
    """
    Get the expected CSV format specifications for all upload types.
    This endpoint provides detailed information about required columns,
    data types, and examples for each CSV upload functionality.
    """
    return {
        "inventory": {
            "description": "Upload inventory items with ingredient details",
            "required_columns": [
                "ingredient_name",
                "quantity", 
                "unit",
                "category",
                "expiry_date",
                "storage_location"
            ],
            "column_descriptions": {
                "ingredient_name": "Name of the ingredient (text, will be converted to lowercase)",
                "quantity": "Amount/quantity of the ingredient (text/number)",
                "unit": "Unit of measurement (text, e.g., 'kg', 'liters', 'pieces')",
                "category": "Category of the ingredient (text, e.g., 'vegetables', 'meat', 'dairy')",
                "expiry_date": "Expiration date in YYYY-MM-DD format",
                "storage_location": "Where the ingredient is stored (text)"
            },
            "data_types": {
                "ingredient_name": "string",
                "quantity": "string", 
                "unit": "string",
                "category": "string",
                "expiry_date": "date (YYYY-MM-DD)",
                "storage_location": "string"
            },
            "sample_data": [
                {
                    "ingredient_name": "tomatoes",
                    "quantity": "5",
                    "unit": "kg",
                    "category": "vegetables", 
                    "expiry_date": "2025-08-15",
                    "storage_location": "refrigerator"
                },
                {
                    "ingredient_name": "chicken breast",
                    "quantity": "2",
                    "unit": "kg",
                    "category": "meat",
                    "expiry_date": "2025-07-30", 
                    "storage_location": "freezer"
                }
            ],
            "notes": [
                "Ingredient names will be converted to lowercase automatically",
                "If an ingredient already exists, it will be updated with new data",
                "Date must be in YYYY-MM-DD format (e.g., 2025-07-25)",
                "All fields are required"
            ]
        },
        
        "dishes": {
            "description": "Upload dishes with their ingredient compositions",
            "required_columns": [
                "dish_name",
                "description",
                "ingredient_name", 
                "quantity",
                "unit"
            ],
            "column_descriptions": {
                "dish_name": "Name of the dish (text)",
                "description": "Description of the dish (text, optional)",
                "ingredient_name": "Name of ingredient used in the dish (must exist in inventory)",
                "quantity": "Amount of this ingredient needed for the dish (number)",
                "unit": "Unit of measurement for the ingredient (text)"
            },
            "data_types": {
                "dish_name": "string",
                "description": "string (optional)",
                "ingredient_name": "string",
                "quantity": "number",
                "unit": "string"
            },
            "sample_data": [
                {
                    "dish_name": "Chicken Salad",
                    "description": "Fresh chicken salad with vegetables",
                    "ingredient_name": "chicken breast",
                    "quantity": 0.5,
                    "unit": "kg"
                },
                {
                    "dish_name": "Chicken Salad", 
                    "description": "Fresh chicken salad with vegetables",
                    "ingredient_name": "tomatoes",
                    "quantity": 0.2,
                    "unit": "kg"
                },
                {
                    "dish_name": "Pasta Marinara",
                    "description": "Classic pasta with tomato sauce", 
                    "ingredient_name": "tomatoes",
                    "quantity": 0.3,
                    "unit": "kg"
                }
            ],
            "notes": [
                "Multiple rows can have the same dish_name to specify different ingredients",
                "All ingredients must already exist in your inventory before uploading dishes",
                "Ingredient names will be matched case-insensitively", 
                "Description field is optional but recommended",
                "If a dish already exists, it will be skipped"
            ]
        },
        
        "sales": {
            "description": "Upload sales records for dishes",
            "required_columns": [
                "dish_name",
                "date",
                "quantity_sold", 
                "price_per_unit"
            ],
            "column_descriptions": {
                "dish_name": "Name of the dish that was sold (must exist in your dishes)",
                "date": "Date when the sale occurred",
                "quantity_sold": "Number of units sold (whole number)",
                "price_per_unit": "Price per unit sold (decimal number)"
            },
            "data_types": {
                "dish_name": "string",
                "date": "date (YYYY-MM-DD)",
                "quantity_sold": "integer", 
                "price_per_unit": "decimal"
            },
            "sample_data": [
                {
                    "dish_name": "Chicken Salad",
                    "date": "2025-07-20",
                    "quantity_sold": 3,
                    "price_per_unit": 15.99
                },
                {
                    "dish_name": "Pasta Marinara", 
                    "date": "2025-07-21",
                    "quantity_sold": 2,
                    "price_per_unit": 12.50
                }
            ],
            "notes": [
                "All dishes must already exist in your dishes before uploading sales",
                "Date must be in YYYY-MM-DD format (e.g., 2025-07-25)",
                "quantity_sold must be a whole number (integer)", 
                "price_per_unit can have decimal places",
                "Dish names are matched exactly (case-sensitive)"
            ]
        },
        
        "general_guidelines": {
            "file_format": "CSV (Comma Separated Values)",
            "encoding": "UTF-8",
            "upload_order": [
                "1. Upload Inventory first (contains ingredients)",
                "2. Upload Dishes second (references ingredients)",
                "3. Upload Sales last (references dishes)"
            ],
            "common_issues": [
                "Missing required columns",
                "Incorrect date format (must be YYYY-MM-DD)",
                "Referencing ingredients/dishes that don't exist yet",
                "Invalid data types (e.g., text in numeric fields)",
                "Empty required fields"
            ],
            "tips": [
                "Use a spreadsheet program like Excel or Google Sheets to create your CSV files",
                "Make sure column headers match exactly (case-sensitive)",
                "Test with a small file first (2-3 rows)",
                "Check your data for typos before uploading",
                "Upload files in the correct order: Inventory → Dishes → Sales"
            ]
        }
    }

@router.get("/csv-formats/{upload_type}")
def get_csv_format_for_type(upload_type: str) -> Dict[str, Any]:
    """
    Get CSV format specification for a specific upload type.
    
    Args:
        upload_type: One of 'inventory', 'dishes', or 'sales'
    """
    formats = get_csv_formats()
    
    if upload_type not in formats:
        return {"error": f"Unknown upload type: {upload_type}. Available types: inventory, dishes, sales"}
    
    return {
        upload_type: formats[upload_type],
        "general_guidelines": formats["general_guidelines"]
    }

@router.get("/csv-template/{upload_type}")
def download_csv_template(upload_type: str):
    """
    Generate a CSV template file for the specified upload type.
    Returns the template as a downloadable CSV file.
    """
    formats = get_csv_formats()
    
    if upload_type not in ["inventory", "dishes", "sales"]:
        return {"error": f"Unknown upload type: {upload_type}"}
    
    format_info = formats[upload_type]
    
    # Create CSV header and sample rows
    headers = format_info["required_columns"]
    sample_rows = format_info["sample_data"]
    
    # Convert to CSV string format
    csv_content = ",".join(headers) + "\n"
    
    for row in sample_rows:
        csv_row = []
        for header in headers:
            csv_row.append(str(row.get(header, "")))
        csv_content += ",".join(csv_row) + "\n"
    
    # Return as downloadable CSV file
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={upload_type}_template.csv"}
    )
