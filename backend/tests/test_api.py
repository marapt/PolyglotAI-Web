"""
Backend API Tests for Polyglot AI Translation App - Iteration 3
Tests: Core translation endpoints + New API key auth, public API, webhooks, docs
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Store generated API key for tests
generated_api_key = None


class TestHealthEndpoints:
    """Health check and basic API endpoints"""
    
    def test_api_root_returns_active(self):
        """Test /api/ returns status active with version 2.0"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"
        assert data["version"] == "2.0"
        assert "message" in data
        print(f"SUCCESS: /api/ returns {data}")
    
    def test_supported_languages_returns_list(self):
        """Test /api/supported-languages returns language lists"""
        response = requests.get(f"{BASE_URL}/api/supported-languages")
        assert response.status_code == 200
        data = response.json()
        
        # Verify spoken languages
        assert "spoken_languages" in data
        assert isinstance(data["spoken_languages"], dict)
        assert len(data["spoken_languages"]) > 50  # Should have 100+ languages
        assert "en" in data["spoken_languages"]
        assert data["spoken_languages"]["en"] == "English"
        
        # Verify sign languages
        assert "sign_languages" in data
        assert isinstance(data["sign_languages"], dict)
        assert "ASL" in data["sign_languages"]
        print(f"SUCCESS: Found {len(data['spoken_languages'])} spoken languages and {len(data['sign_languages'])} sign languages")
    
    def test_history_returns_list(self):
        """Test /api/history returns history list"""
        response = requests.get(f"{BASE_URL}/api/history")
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        assert "count" in data
        assert isinstance(data["history"], list)
        print(f"SUCCESS: History endpoint returns {data['count']} items")


class TestTextTranslation:
    """Text translation endpoint tests"""
    
    def test_translate_english_to_spanish(self):
        """Test /api/translate with English to Spanish"""
        payload = {
            "text": "Hello world",
            "source_language": "English",
            "target_language": "Spanish"
        }
        response = requests.post(f"{BASE_URL}/api/translate", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "original_text" in data
        assert "translated_text" in data
        assert "source_language" in data
        assert "target_language" in data
        assert "timestamp" in data
        
        # Verify data values
        assert data["original_text"] == "Hello world"
        assert data["source_language"] == "English"
        assert data["target_language"] == "Spanish"
        assert len(data["translated_text"]) > 0
        
        print(f"SUCCESS: Translated '{data['original_text']}' to '{data['translated_text']}'")
    
    def test_translate_missing_fields_fails(self):
        """Test /api/translate with missing required fields"""
        payload = {"text": "Hello"}  # Missing source_language and target_language
        response = requests.post(f"{BASE_URL}/api/translate", json=payload)
        assert response.status_code == 422  # Validation error
        print(f"SUCCESS: Missing fields returns 422")


class TestTextToSign:
    """Text to Sign Language endpoint tests"""
    
    def test_text_to_sign_asl(self):
        """Test /api/text-to-sign with ASL"""
        payload = {
            "text": "Hello",
            "sign_language": "ASL"
        }
        response = requests.post(f"{BASE_URL}/api/text-to-sign", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "text" in data
        assert "sign_description" in data
        assert "sign_language" in data
        assert "timestamp" in data
        
        # Verify data values
        assert data["text"] == "Hello"
        assert data["sign_language"] == "ASL"
        assert len(data["sign_description"]) > 0
        
        print(f"SUCCESS: Text-to-sign returned description of {len(data['sign_description'])} chars")


# ==================== NEW ITERATION 3 TESTS ====================

class TestApiKeyGeneration:
    """API Key generation and management tests"""
    
    def test_generate_api_key(self):
        """Test POST /api/keys/generate creates a new API key"""
        global generated_api_key
        payload = {"name": f"TEST_key_{int(time.time())}"}
        response = requests.post(f"{BASE_URL}/api/keys/generate", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "name" in data
        assert "key" in data
        assert "created_at" in data
        
        # Verify key format
        assert data["key"].startswith("pk_")
        assert len(data["key"]) > 20
        
        # Store for later tests
        generated_api_key = data["key"]
        
        print(f"SUCCESS: Generated API key: {data['key'][:15]}...")
    
    def test_list_api_keys_returns_masked(self):
        """Test GET /api/keys returns masked keys list"""
        response = requests.get(f"{BASE_URL}/api/keys")
        assert response.status_code == 200
        data = response.json()
        
        assert "keys" in data
        assert isinstance(data["keys"], list)
        
        # Verify keys are masked (should contain ...)
        if len(data["keys"]) > 0:
            key = data["keys"][0]
            assert "..." in key["key"], "API key should be masked"
            assert "name" in key
            assert "created_at" in key
        
        print(f"SUCCESS: Listed {len(data['keys'])} API keys (masked)")
    
    def test_generate_key_missing_name_fails(self):
        """Test POST /api/keys/generate without name fails"""
        response = requests.post(f"{BASE_URL}/api/keys/generate", json={})
        assert response.status_code == 422
        print(f"SUCCESS: Missing name returns 422")


class TestPublicApiTranslation:
    """Public API translation with key authentication"""
    
    def test_public_translate_with_valid_key(self):
        """Test POST /api/v1/translate with valid API key"""
        global generated_api_key
        if not generated_api_key:
            # Generate a key first
            res = requests.post(f"{BASE_URL}/api/keys/generate", json={"name": "test_public_api"})
            generated_api_key = res.json()["key"]
        
        payload = {
            "text": "Good morning",
            "source_language": "en",
            "target_language": "fr"
        }
        response = requests.post(
            f"{BASE_URL}/api/v1/translate",
            json=payload,
            headers={"X-Api-Key": generated_api_key}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "translated_text" in data
        assert "source_language" in data
        assert "target_language" in data
        assert len(data["translated_text"]) > 0
        
        print(f"SUCCESS: Public API translated to '{data['translated_text']}'")
    
    def test_public_translate_without_key_returns_401(self):
        """Test POST /api/v1/translate without API key returns 401"""
        payload = {
            "text": "Hello",
            "source_language": "en",
            "target_language": "es"
        }
        response = requests.post(f"{BASE_URL}/api/v1/translate", json=payload)
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"SUCCESS: No API key returns 401 with message: {data['detail']}")
    
    def test_public_translate_with_invalid_key_returns_401(self):
        """Test POST /api/v1/translate with invalid API key returns 401"""
        payload = {
            "text": "Hello",
            "source_language": "en",
            "target_language": "es"
        }
        response = requests.post(
            f"{BASE_URL}/api/v1/translate",
            json=payload,
            headers={"X-Api-Key": "invalid_key_12345"}
        )
        assert response.status_code == 401
        print(f"SUCCESS: Invalid API key returns 401")


class TestWidgetTranslation:
    """Widget translation endpoint tests"""
    
    def test_widget_translate_with_valid_key(self):
        """Test POST /api/widget/translate with valid API key"""
        global generated_api_key
        if not generated_api_key:
            res = requests.post(f"{BASE_URL}/api/keys/generate", json={"name": "test_widget"})
            generated_api_key = res.json()["key"]
        
        payload = {
            "text": "Thank you",
            "source_language": "auto",
            "target_language": "de"
        }
        response = requests.post(
            f"{BASE_URL}/api/widget/translate",
            json=payload,
            headers={"X-Api-Key": generated_api_key}
        )
        assert response.status_code == 200
        data = response.json()
        assert "translated_text" in data
        print(f"SUCCESS: Widget translated to '{data['translated_text']}'")
    
    def test_widget_translate_without_key_returns_401(self):
        """Test POST /api/widget/translate without API key returns 401"""
        payload = {"text": "Hello", "target_language": "es"}
        response = requests.post(f"{BASE_URL}/api/widget/translate", json=payload)
        assert response.status_code == 401
        print(f"SUCCESS: Widget without key returns 401")


class TestWebhooks:
    """WhatsApp and Voice webhook endpoint tests"""
    
    def test_whatsapp_webhook_get_returns_status(self):
        """Test GET /api/webhooks/whatsapp returns status"""
        response = requests.get(f"{BASE_URL}/api/webhooks/whatsapp")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "WhatsApp" in data["status"]
        print(f"SUCCESS: WhatsApp webhook GET returns: {data}")
    
    def test_whatsapp_webhook_post_returns_twiml(self):
        """Test POST /api/webhooks/whatsapp returns TwiML response"""
        response = requests.post(
            f"{BASE_URL}/api/webhooks/whatsapp",
            data={"Body": "", "From": ""},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200
        assert "application/xml" in response.headers.get("content-type", "")
        assert "<Response>" in response.text
        assert "<Message>" in response.text
        print(f"SUCCESS: WhatsApp webhook POST returns TwiML")
    
    def test_voice_webhook_post_returns_twiml(self):
        """Test POST /api/webhooks/voice returns TwiML response"""
        response = requests.post(
            f"{BASE_URL}/api/webhooks/voice",
            data={},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200
        assert "application/xml" in response.headers.get("content-type", "")
        assert "<Response>" in response.text
        assert "<Say" in response.text
        assert "<Gather" in response.text
        print(f"SUCCESS: Voice webhook POST returns TwiML with Gather")


class TestApiDocs:
    """API documentation endpoint tests"""
    
    def test_docs_endpoints_returns_documentation(self):
        """Test GET /api/docs/endpoints returns API documentation"""
        response = requests.get(f"{BASE_URL}/api/docs/endpoints")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "name" in data
        assert "version" in data
        assert "endpoints" in data
        assert "authentication" in data
        
        # Verify endpoints list
        assert isinstance(data["endpoints"], list)
        assert len(data["endpoints"]) >= 10  # Should have at least 10 endpoints
        
        # Verify key endpoints are documented
        endpoint_paths = [e["path"] for e in data["endpoints"]]
        assert "/v1/translate" in endpoint_paths
        assert "/keys/generate" in endpoint_paths
        assert "/webhooks/whatsapp" in endpoint_paths
        assert "/webhooks/voice" in endpoint_paths
        
        print(f"SUCCESS: API docs returned {len(data['endpoints'])} endpoints")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
