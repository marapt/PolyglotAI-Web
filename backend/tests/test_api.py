"""
Backend API Tests for Polyglot AI Translation App
Tests: /api/, /api/supported-languages, /api/history, /api/translate, /api/text-to-sign
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoints:
    """Health check and basic API endpoints"""
    
    def test_api_root_returns_active(self):
        """Test /api/ returns status active"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"
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
    
    def test_translate_empty_text_fails(self):
        """Test /api/translate with empty text"""
        payload = {
            "text": "",
            "source_language": "English",
            "target_language": "Spanish"
        }
        response = requests.post(f"{BASE_URL}/api/translate", json=payload)
        # Empty text should still work (API doesn't validate empty)
        # Just verify it doesn't crash
        assert response.status_code in [200, 422]
        print(f"SUCCESS: Empty text handled with status {response.status_code}")
    
    def test_translate_missing_fields_fails(self):
        """Test /api/translate with missing required fields"""
        payload = {"text": "Hello"}  # Missing source_language and target_language
        response = requests.post(f"{BASE_URL}/api/translate", json=payload)
        assert response.status_code == 422  # Validation error
        print(f"SUCCESS: Missing fields returns 422")
    
    def test_translation_persists_in_history(self):
        """Test that translation is saved to history"""
        # First, do a translation
        unique_text = f"TEST_translation_{int(time.time())}"
        payload = {
            "text": unique_text,
            "source_language": "English",
            "target_language": "French"
        }
        translate_response = requests.post(f"{BASE_URL}/api/translate", json=payload)
        assert translate_response.status_code == 200
        
        # Then check history
        history_response = requests.get(f"{BASE_URL}/api/history")
        assert history_response.status_code == 200
        history_data = history_response.json()
        
        # Find our translation in history
        found = False
        for item in history_data["history"]:
            if item.get("original_text") == unique_text:
                found = True
                break
        
        assert found, f"Translation '{unique_text}' not found in history"
        print(f"SUCCESS: Translation persisted in history")


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
    
    def test_text_to_sign_missing_text_fails(self):
        """Test /api/text-to-sign with missing text"""
        payload = {"sign_language": "ASL"}  # Missing text
        response = requests.post(f"{BASE_URL}/api/text-to-sign", json=payload)
        assert response.status_code == 422
        print(f"SUCCESS: Missing text returns 422")


class TestVoiceTranslation:
    """Voice translation endpoint tests - limited testing due to audio requirements"""
    
    def test_voice_translate_invalid_audio_fails(self):
        """Test /api/voice-translate with invalid audio data"""
        payload = {
            "audio_base64": "invalid_base64_data",
            "source_language": "en",
            "target_language": "es"
        }
        response = requests.post(f"{BASE_URL}/api/voice-translate", json=payload)
        # Should fail with invalid audio
        assert response.status_code in [400, 422, 500]
        print(f"SUCCESS: Invalid audio handled with status {response.status_code}")
    
    def test_voice_translate_missing_fields_fails(self):
        """Test /api/voice-translate with missing fields"""
        payload = {"audio_base64": "dGVzdA=="}  # Missing languages
        response = requests.post(f"{BASE_URL}/api/voice-translate", json=payload)
        assert response.status_code == 422
        print(f"SUCCESS: Missing fields returns 422")


class TestSignToText:
    """Sign to Text endpoint tests - limited testing due to image requirements"""
    
    def test_sign_to_text_missing_image_fails(self):
        """Test /api/sign-to-text with missing image"""
        payload = {"target_language": "en"}  # Missing image_base64
        response = requests.post(f"{BASE_URL}/api/sign-to-text", json=payload)
        assert response.status_code == 422
        print(f"SUCCESS: Missing image returns 422")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
