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
