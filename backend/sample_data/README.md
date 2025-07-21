# Sample CSV Files for Menurithm

This folder contains sample CSV files that can be used to test bulk upload functionality in the Menurithm application.

## Files

### 1. `sample_inventory.csv`
Contains sample inventory data with the following columns:
- **ingredient_name**: Name of the ingredient (string)
- **quantity**: Amount in stock (string/number)
- **unit**: Unit of measurement (kg, L, pieces, etc.)
- **category**: Food category (Vegetables, Meat, Dairy, etc.)
- **expiry_date**: Expiration date in YYYY-MM-DD format
- **storage_location**: Where the item is stored (Refrigerator, Freezer, etc.)

**Usage**: Upload this file through the inventory management section of the frontend.

### 2. `sample_sales.csv`
Contains sample sales data with the following columns:
- **dish_name**: Name of the dish sold (must match existing dishes)
- **date**: Sale date in YYYY-MM-DD format
- **quantity_sold**: Number of units sold (integer)
- **price_per_unit**: Price per unit in decimal format

**Usage**: Upload this file through the sales management section. **Note**: The dishes referenced in this file must exist in your system first.

### 3. `sample_dishes.csv` (47 rows)
Contains sample dish data with detailed ingredient specifications:
- **dish_name**: Name of the dish
- **description**: Description of the dish  
- **ingredient_name**: Individual ingredient name (matches inventory)
- **quantity**: Amount of ingredient needed (decimal)
- **unit**: Unit of measurement for the ingredient

**Usage**: Upload this file through the dish management section. Each row represents one ingredient for a dish, so dishes with multiple ingredients have multiple rows.

## Testing Workflow

1. **Upload Inventory**: Upload `sample_inventory.csv` to populate your inventory
2. **Upload Dishes**: Upload `sample_dishes.csv` to create dishes with ingredient specifications  
3. **Upload Sales**: Upload `sample_sales.csv` to populate sales data
4. **Generate Menu**: Use the menu generation feature to create optimized menus

## Data Characteristics

### Inventory Data (25 items)
- Mix of vegetables, meat, seafood, grains, dairy, and seasonings
- Realistic quantities and units
- Various storage locations
- Expiry dates ranging from near-term to long-term storage

### Sales Data (50 records)
- 10 different dishes
- 5 days of sales data (July 1-5, 2025)
- Realistic quantities and prices
- Varying popularity across different dishes

### Dishes Data (47 rows)
- 10 unique dishes with detailed ingredient breakdowns
- Realistic ingredient quantities per serving
- All ingredients reference items in inventory
- Multiple rows per dish (one per ingredient)

### Revenue Summary
- Total revenue: ~$8,400 over 5 days
- Average order value: ~$16.80
- Most popular: Beef Burger (125 units)
- Highest revenue: Beef Burger (~$1,812)
- Premium item: BBQ Ribs ($26.00/unit)

## File Format Requirements

### CSV Format
- UTF-8 encoding
- Comma-separated values
- First row must contain column headers (exactly as specified)
- No empty rows between data
- Dates in YYYY-MM-DD format

### Data Validation
- All required fields must have values
- Dates must be valid and in correct format
- Numeric fields (quantity_sold, price_per_unit) must be valid numbers
- ingredient_name will be converted to lowercase automatically

## Error Handling

The upload system includes comprehensive error handling:
- Invalid dates will be reported with row numbers
- Missing required fields will cause row-specific errors
- Duplicate ingredients per user will update existing records
- Sales records for non-existent dishes will be skipped

## Customization

To create your own CSV files:
1. Keep the same column headers
2. Ensure dates are in YYYY-MM-DD format
3. Use realistic data that matches your business
4. Test with small files first before uploading large datasets

## Support

If you encounter issues with CSV uploads:
1. Check that column headers match exactly
2. Verify date formats (YYYY-MM-DD)
3. Ensure numeric fields contain valid numbers
4. Check the application logs for detailed error messages
