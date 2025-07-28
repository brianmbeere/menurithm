#!/usr/bin/env python3
"""
Service-to-Service Dish Creation Test Script
Demonstrates how to create dishes using API key authentication
"""

import requests
import json
from typing import List, Dict, Any

# Configuration
BASE_URL = "http://localhost:8000"
API_KEY = "integration-key-456"  # From your .env file

# Headers for service authentication
HEADERS = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

def test_single_dish_creation():
    """Test creating a single dish via service endpoint"""
    print("🍕 Testing Single Dish Creation...")
    
    dish_data = {
        "name": "Margherita Pizza",
        "description": "Classic pizza with tomato, mozzarella, and basil",
        "user_email": "chef@restaurant.com",  # Optional: specify target user
        "ingredients": [
            {
                "ingredient_id": 1,  # Assuming these inventory items exist
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
    
    response = requests.post(
        f"{BASE_URL}/service/dishes",
        headers=HEADERS,
        json=dish_data
    )
    
    if response.status_code == 200:
        dish = response.json()
        print(f"✅ Dish created successfully!")
        print(f"   ID: {dish['id']}")
        print(f"   Name: {dish['name']}")
        print(f"   Ingredients: {len(dish['ingredients'])}")
        return dish
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return None

def test_batch_dish_creation():
    """Test creating multiple dishes in batch"""
    print("\n🍽️ Testing Batch Dish Creation...")
    
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
            },
            {
                "name": "Beef Burger",
                "description": "Juicy beef patty with lettuce and tomato",
                "ingredients": [
                    {"ingredient_id": 7, "quantity": 150.0, "unit": "grams"},
                    {"ingredient_id": 8, "quantity": 1.0, "unit": "piece"}
                ]
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/service/dishes/batch",
        headers=HEADERS,
        json=batch_data
    )
    
    if response.status_code == 200:
        dishes = response.json()
        print(f"✅ {len(dishes)} dishes created successfully!")
        for dish in dishes:
            print(f"   - {dish['name']} (ID: {dish['id']})")
        return dishes
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return None

def test_system_user_creation():
    """Test creating dish for system user (no user_email specified)"""
    print("\n🤖 Testing System User Dish Creation...")
    
    dish_data = {
        "name": "System Special",
        "description": "A dish created by the system service",
        # No user_email - will default to system@menurithm.com
        "ingredients": [
            {
                "ingredient_id": 1,
                "quantity": 100.0,
                "unit": "grams"
            }
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/service/dishes",
        headers=HEADERS,
        json=dish_data
    )
    
    if response.status_code == 200:
        dish = response.json()
        print(f"✅ System dish created successfully!")
        print(f"   Name: {dish['name']}")
        return dish
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return None

def test_invalid_api_key():
    """Test authentication failure with invalid API key"""
    print("\n🔒 Testing Invalid API Key...")
    
    invalid_headers = {
        "X-API-Key": "invalid-key-123",
        "Content-Type": "application/json"
    }
    
    dish_data = {
        "name": "Should Fail",
        "description": "This should not be created",
        "ingredients": []
    }
    
    response = requests.post(
        f"{BASE_URL}/service/dishes",
        headers=invalid_headers,
        json=dish_data
    )
    
    if response.status_code == 401:
        print("✅ Authentication properly rejected invalid API key")
    else:
        print(f"❌ Unexpected response: {response.status_code}")

def test_flexible_auth_endpoint():
    """Test the flexible auth endpoint that accepts API keys"""
    print("\n🔄 Testing Flexible Auth Endpoint...")
    
    response = requests.get(
        f"{BASE_URL}/auth/flexible-auth",
        headers={"X-API-Key": API_KEY}
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Flexible auth successful!")
        print(f"   Auth type: {result['auth_type']}")
        print(f"   User: {result['user']}")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    print("🚀 Menurithm Service-to-Service Dish Creation Test")
    print("=" * 50)
    
    # Test sequence
    test_invalid_api_key()
    test_flexible_auth_endpoint()
    test_single_dish_creation()
    test_batch_dish_creation() 
    test_system_user_creation()
    
    print("\n" + "=" * 50)
    print("🎉 Service integration tests completed!")
    
    print("\n📋 Usage Examples:")
    print("1. Single dish with specific user:")
    print("   POST /service/dishes with user_email in payload")
    
    print("\n2. Batch creation:")
    print("   POST /service/dishes/batch with array of dishes")
    
    print("\n3. System dishes:")
    print("   POST /service/dishes without user_email (defaults to system user)")
    
    print(f"\n🔑 API Key used: {API_KEY}")
    print("🔗 All endpoints require X-API-Key header for authentication")
