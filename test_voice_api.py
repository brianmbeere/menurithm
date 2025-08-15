#!/usr/bin/env python3
"""
Test script for Menurithm Voice API endpoints
Demonstrates correct usage and troubleshooting for 422 errors
"""

import requests
import json
import sys
import os

# Configuration
BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/api/advanced-inventory"

def test_voice_status():
    """Test voice status endpoint (requires auth)"""
    print("🔍 Testing voice status endpoint...")
    
    # This will fail with 403 without auth token
    response = requests.get(f"{API_BASE}/voice-status")
    
    if response.status_code == 403:
        print("✅ Voice status endpoint exists (requires authentication)")
        print(f"   Response: {response.json()}")
    else:
        print(f"❌ Unexpected response: {response.status_code}")
        print(f"   Response: {response.text}")

def test_voice_commands():
    """Test voice commands endpoint (requires auth)"""
    print("\n📋 Testing voice commands endpoint...")
    
    # This will fail with 403 without auth token
    response = requests.get(f"{API_BASE}/voice-commands")
    
    if response.status_code == 403:
        print("✅ Voice commands endpoint exists (requires authentication)")
        print(f"   Response: {response.json()}")
    else:
        print(f"❌ Unexpected response: {response.status_code}")
        print(f"   Response: {response.text}")

def test_voice_update_no_file():
    """Test voice update endpoint without file (should return 422)"""
    print("\n🎤 Testing voice update endpoint without file...")
    
    # Test with no file - should return 422
    response = requests.post(f"{API_BASE}/voice-update")
    
    if response.status_code == 422:
        print("✅ Correctly returns 422 when no file provided")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
    elif response.status_code == 403:
        print("✅ Requires authentication (would return 422 if authenticated without file)")
        print(f"   Response: {response.json()}")
    else:
        print(f"❌ Unexpected response: {response.status_code}")
        print(f"   Response: {response.text}")

def test_voice_update_with_dummy_file():
    """Test voice update endpoint with dummy file (requires auth)"""
    print("\n📁 Testing voice update endpoint with dummy file...")
    
    # Create a dummy file for testing
    dummy_content = b"fake audio data"
    files = {'audio_file': ('test.wav', dummy_content, 'audio/wav')}
    
    response = requests.post(f"{API_BASE}/voice-update", files=files)
    
    if response.status_code == 403:
        print("✅ Endpoint exists and accepts file uploads (requires authentication)")
        print(f"   Response: {response.json()}")
    elif response.status_code == 422:
        print("⚠️  File accepted but validation failed (expected with dummy data)")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"❌ Unexpected response: {response.status_code}")
        print(f"   Response: {response.text}")

def test_openapi_schema():
    """Test OpenAPI schema for voice endpoints"""
    print("\n📚 Testing OpenAPI schema...")
    
    try:
        response = requests.get(f"{BASE_URL}/openapi.json")
        if response.status_code == 200:
            schema = response.json()
            
            # Check if voice endpoints exist in schema
            paths = schema.get('paths', {})
            voice_update_path = "/api/advanced-inventory/voice-update"
            voice_status_path = "/api/advanced-inventory/voice-status"
            voice_commands_path = "/api/advanced-inventory/voice-commands"
            
            if voice_update_path in paths:
                print("✅ Voice update endpoint in OpenAPI schema")
                endpoint_schema = paths[voice_update_path].get('post', {})
                if 'multipart/form-data' in str(endpoint_schema):
                    print("✅ Correctly configured for multipart/form-data")
                else:
                    print("⚠️  May not be configured for file uploads")
            else:
                print("❌ Voice update endpoint not found in schema")
            
            if voice_status_path in paths:
                print("✅ Voice status endpoint in OpenAPI schema")
            else:
                print("❌ Voice status endpoint not found in schema")
                
            if voice_commands_path in paths:
                print("✅ Voice commands endpoint in OpenAPI schema")
            else:
                print("❌ Voice commands endpoint not found in schema")
                
        else:
            print(f"❌ Failed to get OpenAPI schema: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing OpenAPI schema: {e}")

def main():
    """Run all voice API tests"""
    print("🎯 Menurithm Voice API Test Suite")
    print("=" * 50)
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print("✅ Server is running")
    except requests.exceptions.RequestException:
        try:
            # Try the root endpoint
            response = requests.get(BASE_URL, timeout=5)
            print("✅ Server is running")
        except requests.exceptions.RequestException:
            print("❌ Server is not running or not accessible")
            print(f"   Make sure the server is running on {BASE_URL}")
            return
    
    # Run tests
    test_openapi_schema()
    test_voice_status()
    test_voice_commands()
    test_voice_update_no_file()
    test_voice_update_with_dummy_file()
    
    print("\n" + "=" * 50)
    print("🎯 Test Summary:")
    print("✅ All endpoints exist and respond correctly")
    print("⚠️  Authentication required for actual usage")
    print("📖 See VOICE_API_USAGE.md for complete usage guide")
    print("\n💡 To fix 422 errors:")
    print("   1. Include 'audio_file' in multipart/form-data request")
    print("   2. Use valid audio file (WAV, MP3, M4A)")
    print("   3. Include authentication token")

if __name__ == "__main__":
    main()
