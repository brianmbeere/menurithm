# 🚀 Service-to-Service Dish Creation - cURL Examples

This document provides comprehensive cURL examples for testing the Menurithm service-to-service dish creation endpoints.

## 🔧 Configuration

```bash
BASE_URL="http://localhost:8000"
API_KEY="integration-key-456"
```

## 📋 Available Examples

### 1. 🍕 Single Dish Creation

Create a single dish with specific user targeting:

```bash
curl -X POST "${BASE_URL}/service/dishes" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Margherita Pizza",
    "description": "Classic pizza with tomato, mozzarella, and basil",
    "user_email": "chef@restaurant.com",
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
  }' | jq '.'
```

### 2. 🍽️ Batch Dish Creation

Create multiple dishes in a single transaction:

```bash
curl -X POST "${BASE_URL}/service/dishes/batch" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
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
  }' | jq '.'
```

### 3. 🤖 System User Dish Creation

Create a dish for the system user (no user specified):

```bash
curl -X POST "${BASE_URL}/service/dishes" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "System Special",
    "description": "A dish created by the system service",
    "ingredients": [
      {
        "ingredient_id": 1,
        "quantity": 100.0,
        "unit": "grams"
      }
    ]
  }' | jq '.'
```

### 4. 🔄 Authentication Test

Test the flexible authentication endpoint:

```bash
curl -X GET "${BASE_URL}/auth/flexible-auth" \
  -H "X-API-Key: ${API_KEY}" | jq '.'
```

### 5. 🔒 Invalid API Key Test

Test authentication failure (should return 401):

```bash
curl -X POST "${BASE_URL}/service/dishes" \
  -H "X-API-Key: invalid-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Should Fail",
    "description": "This should not be created",
    "ingredients": []
  }'
```

## 📊 Expected Responses

### ✅ Successful Dish Creation

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

### ❌ Authentication Error

```json
{
  "detail": "Invalid API key"
}
```

### ⚠️ Validation Error

```json
{
  "detail": "Ingredient with id 999 not found"
}
```

## 📋 Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/service/dishes` | POST | Single dish creation |
| `/service/dishes/batch` | POST | Batch dish creation |
| `/auth/flexible-auth` | GET | Authentication test |

## 🔑 Authentication

**Required Header:** `X-API-Key: integration-key-456`

**Available API Keys:**
- `test-key-123`
- `integration-key-456` ⭐ (recommended)
- `service-key-789`

## 🎯 Key Features

- **User Targeting**: Optional `user_email` in payload
- **System Fallback**: Defaults to `system@menurithm.com`
- **Batch Processing**: Multiple dishes in single transaction
- **Error Handling**: Comprehensive validation and error messages
- **Rate Limiting**: 100 requests per 60 seconds

## 📝 Notes

1. Replace `${BASE_URL}` with your actual server URL
2. Replace `${API_KEY}` with your valid API key
3. Ensure ingredient IDs exist in your database
4. Use `jq '.'` for formatted JSON output (optional)
5. All requests require `Content-Type: application/json` header

---

For more detailed information, see the [Service Dish Creation Guide](SERVICE_DISH_CREATION_GUIDE.md).
