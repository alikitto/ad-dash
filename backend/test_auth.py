#!/usr/bin/env python3
"""
Test script for authentication endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_auth_endpoints():
    """Test authentication endpoints"""
    
    print("🧪 Testing Authentication Endpoints")
    print("=" * 50)
    
    # Test 1: Health check
    print("\n1. Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return
    
    # Test 2: Sign up
    print("\n2. Testing sign up...")
    signup_data = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/signup",
            json=signup_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Sign in
    print("\n3. Testing sign in...")
    signin_data = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/token",
            json=signin_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            token = response.json().get("access_token")
            print(f"   ✅ Token received: {token[:20]}...")
        else:
            print(f"   ❌ Login failed")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Test completed!")

if __name__ == "__main__":
    test_auth_endpoints()
