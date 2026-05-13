import pytest
from fastapi.testclient import TestClient
import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

from server import app

client = TestClient(app)

def test_read_main():
    response = client.get("/api/")
    assert response.status_code == 200
    assert response.json()["status"] == "active"

def test_translate_endpoint():
    payload = {
        "text": "Hello, how are you?",
        "source_language": "en",
        "target_language": "es"
    }
    response = client.post("/api/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "translated_text" in data
    assert data["source_language"] == "en"
    assert data["target_language"] == "es"

def test_text_to_sign_endpoint():
    payload = {
        "text": "Hello",
        "sign_language": "ASL"
    }
    response = client.post("/api/text-to-sign", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "sign_description" in data
    assert data["text"] == "Hello"
    assert data["sign_language"] == "ASL"

def test_supported_languages():
    response = client.get("/api/supported-languages")
    assert response.status_code == 200
    data = response.json()
    assert "spoken_languages" in data
    assert "sign_languages" in data
    assert "en" in data["spoken_languages"]

def test_whatsapp_webhook_get():
    """Test WhatsApp verification endpoint"""
    response = client.get("/api/webhooks/whatsapp")
    assert response.status_code == 200
    assert response.json()["status"] == "WhatsApp webhook active"

def test_whatsapp_webhook_post():
    """Test WhatsApp translation message payload"""
    # Simulate a Twilio/WhatsApp urlencoded form submission
    data = {
        "Body": "Hello world",
        "From": "whatsapp:+1234567890"
    }
    response = client.post("/api/webhooks/whatsapp", data=data)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/xml")
    assert "<Response><Message>" in response.text
    # The output should contain the translated text

def test_whatsapp_webhook_post_with_command():
    """Test WhatsApp explicit translation command"""
    data = {
        "Body": "/to fr Good morning",
        "From": "whatsapp:+1234567890"
    }
    response = client.post("/api/webhooks/whatsapp", data=data)
    assert response.status_code == 200
    assert "<Response><Message>" in response.text
    assert "Bonjour" in response.text or "bon matin" in response.text.lower()

def test_voice_webhook_post():
    """Test Voice webhook (Twilio speech recognition payload)"""
    data = {
        "SpeechResult": "What time is it?",
        "From": "+1234567890"
    }
    response = client.post("/api/webhooks/voice", data=data)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/xml")
    assert "<Response>" in response.text
    assert "<Say" in response.text
