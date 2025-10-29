import requests
import json

def test_unified_ai_api():
    url = "http://localhost:8000/api/v1/ai/chat"
    
    payload = {
        "messages": [
            {
                "role": "user",
                "content": "Merhaba CLIFF, nasılsın?"
            }
        ]
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        print("🚀 Testing Unified AI API...")
        print(f"URL: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ SUCCESS!")
            print(f"Response: {json.dumps(result, indent=2)}")
        else:
            print("❌ ERROR!")
            print(f"Response Text: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"💥 Request Exception: {e}")
    except Exception as e:
        print(f"💥 Unexpected Error: {e}")

if __name__ == "__main__":
    test_unified_ai_api()