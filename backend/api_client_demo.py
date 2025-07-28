#!/usr/bin/env python3
"""
Example script demonstrating non-user API access to Menurithm API
Shows public endpoints, API key authentication, and different use cases
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000"
API_KEY = "test-key-123"

class MenurithmAPIClient:
    def __init__(self, base_url: str, api_key: str = None):
        self.base_url = base_url
        self.api_key = api_key
        self.session = requests.Session()
        
        if api_key:
            self.session.headers.update({
                "X-API-Key": api_key,
                "Content-Type": "application/json"
            })
    
    def public_health_check(self):
        """Test public endpoint - no authentication required"""
        response = self.session.get(f"{self.base_url}/health")
        return response.json()
    
    def public_api_info(self):
        """Get API information - public endpoint"""
        response = self.session.get(f"{self.base_url}/")
        return response.json()
    
    def test_public_endpoint(self):
        """Test our demo public endpoint"""
        response = self.session.get(f"{self.base_url}/test/public")
        return response.json()
    
    def test_api_key_auth(self):
        """Test API key authentication"""
        if not self.api_key:
            raise ValueError("API key required for this endpoint")
        
        response = self.session.get(f"{self.base_url}/test/api-key-only")
        response.raise_for_status()
        return response.json()
    
    def submit_data(self, data: dict):
        """Submit data via API key authentication"""
        if not self.api_key:
            raise ValueError("API key required for this endpoint")
        
        response = self.session.post(
            f"{self.base_url}/test/data-ingestion",
            json=data
        )
        response.raise_for_status()
        return response.json()
    
    def get_service_status(self):
        """Get service status for monitoring"""
        if not self.api_key:
            raise ValueError("API key required for this endpoint")
        
        response = self.session.get(f"{self.base_url}/test/service-status")
        response.raise_for_status()
        return response.json()
    
    def test_flexible_auth(self):
        """Test flexible authentication endpoint"""
        response = self.session.get(f"{self.base_url}/test/flexible-auth")
        response.raise_for_status()
        return response.json()

def main():
    print("🚀 Menurithm API Client Demo")
    print("=" * 50)
    
    # Test public endpoints (no API key needed)
    print("\n📋 Testing Public Endpoints:")
    public_client = MenurithmAPIClient(BASE_URL)
    
    try:
        health = public_client.public_health_check()
        print(f"✅ Health Check: {health['status']}")
        
        info = public_client.public_api_info()
        print(f"✅ API Info: {info['message'][:50]}...")
        
        public_test = public_client.test_public_endpoint()
        print(f"✅ Public Test: {public_test['access']}")
    
    except requests.RequestException as e:
        print(f"❌ Public endpoints error: {e}")
    
    # Test API key endpoints
    print(f"\n🔑 Testing API Key Endpoints (Key: {API_KEY}):")
    api_client = MenurithmAPIClient(BASE_URL, API_KEY)
    
    try:
        # Test API key authentication
        auth_test = api_client.test_api_key_auth()
        print(f"✅ API Key Auth: {auth_test['access']}")
        
        # Test data submission
        test_data = {
            "message": "Automated system check",
            "timestamp": datetime.now().isoformat(),
            "source": "python_script",
            "data": {"temperature": 23.5, "humidity": 45}
        }
        
        submission = api_client.submit_data(test_data)
        print(f"✅ Data Submission: {submission['status']}")
        
        # Test service status
        status = api_client.get_service_status()
        print(f"✅ Service Status: {status['status']}")
        
        # Test flexible auth
        flex_auth = api_client.test_flexible_auth()
        print(f"✅ Flexible Auth: {flex_auth['auth_type']}")
        
    except requests.RequestException as e:
        print(f"❌ API key endpoints error: {e}")
    
    print("\n🎉 Demo completed!")
    print("\n💡 Use Cases Demonstrated:")
    print("   • Health monitoring and status checks")
    print("   • Automated data submission") 
    print("   • Service-to-service communication")
    print("   • System integration capabilities")

if __name__ == "__main__":
    main()
