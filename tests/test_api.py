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


# ==================== n8n WEBHOOK TESTS ====================

def test_n8n_webhook_translate_no_secret():
    """When N8N_WEBHOOK_SECRET is not set, endpoint should accept any request (open mode)"""
    os.environ.pop("N8N_WEBHOOK_SECRET", None)  # ensure not set
    payload = {
        "action": "translate",
        "text": "Hello world",
        "source_language": "en",
        "target_language": "es"
    }
    response = client.post("/api/webhooks/n8n", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["action"] == "translate"
    assert "translated_text" in data
    assert data["original_text"] == "Hello world"


def test_n8n_webhook_translate_with_valid_secret():
    """With N8N_WEBHOOK_SECRET set, valid key should pass"""
    os.environ["N8N_WEBHOOK_SECRET"] = "test-secret-123"
    payload = {
        "action": "translate",
        "text": "Good morning",
        "source_language": "en",
        "target_language": "fr"
    }
    response = client.post(
        "/api/webhooks/n8n",
        json=payload,
        headers={"X-N8N-API-Key": "test-secret-123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "translated_text" in data
    os.environ.pop("N8N_WEBHOOK_SECRET", None)


def test_n8n_webhook_invalid_api_key():
    """With N8N_WEBHOOK_SECRET set, wrong key must return 403"""
    os.environ["N8N_WEBHOOK_SECRET"] = "correct-secret"
    payload = {
        "action": "translate",
        "text": "Hello",
        "source_language": "en",
        "target_language": "de"
    }
    response = client.post(
        "/api/webhooks/n8n",
        json=payload,
        headers={"X-N8N-API-Key": "wrong-key"}
    )
    assert response.status_code == 403
    os.environ.pop("N8N_WEBHOOK_SECRET", None)


def test_n8n_webhook_unknown_action():
    """Unknown action should return 400"""
    payload = {
        "action": "delete-everything",
        "text": "test"
    }
    response = client.post("/api/webhooks/n8n", json=payload)
    assert response.status_code == 400


def test_n8n_webhook_translate_missing_text():
    """translate action without text field should return 400"""
    payload = {
        "action": "translate",
        "source_language": "en",
        "target_language": "es"
    }
    response = client.post("/api/webhooks/n8n", json=payload)
    assert response.status_code == 400
