# 🍽️ Service-to-Service Dish Creation API

This guide demonstrates how to create dishes using the Menurithm API's service-to-service endpoints with API key authentication.

## 🔑 Authentication

All service endpoints require an API key in the `X-API-Key` header. Available keys from your `.env`:

```
test-key-123
integration-key-456  ⭐ (recommended for integration)
service-key-789
```

## 📍 Available Endpoints

### 1. Single Dish Creation
`POST /service/dishes`

Creates a single dish with optional user targeting.

**Request Body:**
```json
{
  "name": "Margherita Pizza",
  "description": "Classic pizza with tomato, mozzarella, and basil",
  "user_email": "chef@restaurant.com",  // Optional - defaults to system@menurithm.com
  "ingredients": [
    {
      "ingredient_id": 1,
      "quantity": 200.0,
      "unit": "grams"
    },
    {
      "ingredient_id": 2,
      "quantity": 150.0,
      "unit": "grams"
    }
  ]
}
```

**Response:**
```json
{
  "id": 123,
  "name": "Margherita Pizza",
  "description": "Classic pizza with tomato, mozzarella, and basil",
  "ingredients": [
    {
      "ingredient_id": 1,
      "ingredient_name": "Mozzarella Cheese",
      "quantity": 200.0,
      "unit": "grams"
    },
    {
      "ingredient_id": 2,
      "ingredient_name": "Tomato Sauce",
      "quantity": 150.0,
      "unit": "grams"
    }
  ]
}
```

### 2. Batch Dish Creation
`POST /service/dishes/batch`

Creates multiple dishes in a single transaction.

**Request Body:**
```json
{
  "user_email": "chef@restaurant.com",  // Optional - applies to all dishes
  "dishes": [
    {
      "name": "Caesar Salad",
      "description": "Fresh romaine lettuce with caesar dressing",
      "ingredients": [
        {"ingredient_id": 3, "quantity": 100.0, "unit": "grams"},
        {"ingredient_id": 4, "quantity": 50.0, "unit": "ml"}
      ]
    },
    {
      "name": "Chicken Alfredo",
      "description": "Creamy pasta with grilled chicken",
      "ingredients": [
        {"ingredient_id": 5, "quantity": 300.0, "unit": "grams"},
        {"ingredient_id": 6, "quantity": 200.0, "unit": "ml"}
      ]
    }
  ]
}
```

**Response:** Array of created dish objects

## 🐍 Python Examples

### Basic Single Dish Creation
```python
import requests

API_KEY = "integration-key-456"
BASE_URL = "http://localhost:8000"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

dish_data = {
    "name": "Margherita Pizza",
    "description": "Classic pizza with tomato, mozzarella, and basil",
    "user_email": "chef@restaurant.com",
    "ingredients": [
        {"ingredient_id": 1, "quantity": 200.0, "unit": "grams"},
        {"ingredient_id": 2, "quantity": 150.0, "unit": "grams"}
    ]
}

response = requests.post(
    f"{BASE_URL}/service/dishes",
    headers=headers,
    json=dish_data
)

if response.status_code == 200:
    dish = response.json()
    print(f"Dish created: {dish['name']} (ID: {dish['id']})")
else:
    print(f"Error: {response.status_code} - {response.text}")
```

### Batch Creation Example
```python
batch_data = {
    "user_email": "chef@restaurant.com",
    "dishes": [
        {
            "name": "Caesar Salad",
            "description": "Fresh romaine lettuce with caesar dressing",
            "ingredients": [
                {"ingredient_id": 3, "quantity": 100.0, "unit": "grams"},
                {"ingredient_id": 4, "quantity": 50.0, "unit": "ml"}
            ]
        },
        {
            "name": "Chicken Alfredo",
            "description": "Creamy pasta with grilled chicken",
            "ingredients": [
                {"ingredient_id": 5, "quantity": 300.0, "unit": "grams"},
                {"ingredient_id": 6, "quantity": 200.0, "unit": "ml"}
            ]
        }
    ]
}

response = requests.post(
    f"{BASE_URL}/service/dishes/batch",
    headers=headers,
    json=batch_data
)

if response.status_code == 200:
    dishes = response.json()
    print(f"Created {len(dishes)} dishes successfully!")
```

## 💻 cURL Examples

### Single Dish Creation
```bash
curl -X POST "http://localhost:8000/service/dishes" \
  -H "X-API-Key: integration-key-456" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Margherita Pizza",
    "description": "Classic pizza with tomato, mozzarella, and basil",
    "user_email": "chef@restaurant.com",
    "ingredients": [
      {"ingredient_id": 1, "quantity": 200.0, "unit": "grams"},
      {"ingredient_id": 2, "quantity": 150.0, "unit": "grams"}
    ]
  }'
```

### Batch Creation
```bash
curl -X POST "http://localhost:8000/service/dishes/batch" \
  -H "X-API-Key: integration-key-456" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "chef@restaurant.com",
    "dishes": [
      {
        "name": "Caesar Salad",
        "description": "Fresh romaine lettuce with caesar dressing",
        "ingredients": [
          {"ingredient_id": 3, "quantity": 100.0, "unit": "grams"}
        ]
      }
    ]
  }'
```

## 🔧 Advanced Features

### System User Creation
If you don't specify `user_email`, dishes are created for the system user:

```python
dish_data = {
    "name": "System Special",
    "description": "A dish created by the system service",
    # No user_email - defaults to system@menurithm.com
    "ingredients": [
        {"ingredient_id": 1, "quantity": 100.0, "unit": "grams"}
    ]
}
```

### Error Handling
The API provides detailed error messages:

```python
if response.status_code == 400:
    error = response.json()
    if "already exists" in error["detail"]:
        print("Dish already exists for this user")
    elif "not found" in error["detail"]:
        print("Invalid ingredient ID")
        
elif response.status_code == 401:
    print("Invalid API key")
```

## 🛡️ Security Features

- **API Key Authentication**: All endpoints require valid API key
- **Rate Limiting**: 100 requests per 60 seconds (configurable)
- **Input Validation**: Automatic validation of ingredient IDs and data types
- **User Scoping**: Optional user targeting with system fallback
- **Audit Logging**: All service calls are logged for security

## 📊 Comparison: Service vs Regular Endpoints

| Feature | Regular `/dishes` | Service `/service/dishes` |
|---------|------------------|---------------------------|
| Authentication | Firebase JWT | API Key |
| User Context | Required (from token) | Optional (parameter) |
| Batch Creation | ❌ | ✅ |
| System Users | ❌ | ✅ |
| Rate Limiting | User-based | API key-based |
| Use Case | Frontend apps | Service integration |

## 🚀 Testing

Run the included test script:
```bash
python test_service_dish_creation.py
```

Or use the cURL examples:
```bash
./curl_dish_service_examples.sh
```

## 📋 Prerequisites

1. **Valid API Key**: Ensure your API key is in the `VALID_API_KEYS` environment variable
2. **Existing Ingredients**: Ingredient IDs must reference existing inventory items
3. **Running Server**: Backend server must be running on specified port

## 🔗 Related Endpoints

- `GET /auth/flexible-auth` - Test API key authentication
- `GET /dishes` - List dishes for authenticated user
- `POST /dishes` - Create dish with Firebase authentication
- `POST /upload-dishes` - Bulk upload via CSV

---

**🎉 Your Menurithm API now supports full service-to-service dish creation with enterprise-grade authentication and batch processing capabilities!**
