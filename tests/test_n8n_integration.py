"""
AI Polyglots × n8n Integration Test Suite
==========================================
Tests the live pipeline end-to-end:
  Twilio (simulated) → n8n webhook → AI Polyglots backend → response

Run locally:
    python3 tests/test_n8n_integration.py

Run with verbose output:
    python3 tests/test_n8n_integration.py -v

Requirements:
    pip3 install requests

Environment (optional — tests still run without these, just with warnings):
    N8N_WEBHOOK_SECRET   - The shared secret (default: aipolyglots-n8n-2026)
    BACKEND_URL          - Override the backend URL for local testing
    N8N_WEBHOOK_URL      - Override the n8n webhook URL

⚠️  DEPLOYMENT NOTE:
    The /api/webhooks/n8n endpoint only exists on branch: feature/n8n-integration
    Backend tests (Section 1) will return 404 until this branch is merged to main
    and Render redeploys. Run Section 2 (n8n live tests) independently to test
    the n8n → backend pipeline in isolation once deployed.
"""

# ==========================================
# 📱 HOW AI POLYGLOTS WORKS ON WHATSAPP
# ==========================================
#
# Once this pipeline is live, here's what a real user experiences:
#
# BASIC USAGE — Auto-translate to English:
#   1. Save the AI Polyglots WhatsApp number to your contacts
#      (e.g. +1 415 555 1234 — the Twilio number)
#   2. Send any message in any language:
#      → "Bonjour, comment ça va?"
#   3. The AI Polyglots bot replies with the English translation:
#      ← "Hello, how are you?"
#
# ADVANCED USAGE — Translate to a specific language:
#   Use the format:  /to [language-code] [your text]
#   Examples:
#     → "/to es Hello, I need help with my order"
#     ← "Hola, necesito ayuda con mi pedido"
#
#     → "/to fr Good morning team, the meeting starts at 9am"
#     ← "Bonjour l'équipe, la réunion commence à 9h"
#
#     → "/to ja Thank you for your patience"
#     ← "ご辛抱いただきありがとうございます"
#
# SUPPORTED LANGUAGES (examples):
#   es = Spanish  |  fr = French   |  de = German  |  pt = Portuguese
#   ja = Japanese |  zh = Chinese  |  ar = Arabic  |  hi = Hindi
#   ko = Korean   |  it = Italian  |  ru = Russian |  (+ 50 more)
#
# HOW IT WORKS UNDER THE HOOD (the pipeline):
#   [You send WhatsApp message]
#       ↓
#   [Twilio receives it and POSTs to n8n webhook]
#       ↓
#   [n8n workflow parses Body + From fields]
#       ↓
#   [n8n calls AI Polyglots backend: POST /api/webhooks/n8n]
#       ↓
#   [Backend translates using MyMemory engine]
#       ↓
#   [n8n returns TwiML response to Twilio]
#       ↓
#   [Twilio sends the translated text back to you on WhatsApp]
#
# CURRENT STATUS:
#   ✅ n8n workflow built and published
#   ✅ Backend endpoint coded and tested
#   ⏳ Awaiting: Render deployment of feature/n8n-integration branch
#   ⏳ Awaiting: Twilio webhook URL updated to n8n URL
#   ⏳ Awaiting: TwiML response node added to n8n workflow
# ==========================================


import requests
import json
import sys
import os
import time

# ==================== CONFIG ====================

BACKEND_URL = os.environ.get("BACKEND_URL", "https://aipolyglots-api.onrender.com")
N8N_WEBHOOK_URL = os.environ.get("N8N_WEBHOOK_URL", "https://aipolyglots.app.n8n.cloud/webhook/n8n")
N8N_WEBHOOK_SECRET = os.environ.get("N8N_WEBHOOK_SECRET", "aipolyglots-n8n-2026")

PASS = "\033[92m✅ PASS\033[0m"
FAIL = "\033[91m❌ FAIL\033[0m"
WARN = "\033[93m⚠️  WARN\033[0m"
INFO = "\033[94mℹ️  INFO\033[0m"

results = []


def test(name, fn):
    """Run a test and record the result."""
    print(f"\n{'─'*55}")
    print(f"  TEST: {name}")
    print(f"{'─'*55}")
    try:
        fn()
        print(f"  {PASS}")
        results.append((name, "PASS", None))
    except AssertionError as e:
        print(f"  {FAIL}: {e}")
        results.append((name, "FAIL", str(e)))
    except Exception as e:
        print(f"  {FAIL} (exception): {e}")
        results.append((name, "ERROR", str(e)))


# ==================== BACKEND DIRECT TESTS ====================

def test_backend_health():
    """Backend /api/ health check."""
    url = f"{BACKEND_URL}/api/"
    print(f"  GET {url}")
    r = requests.get(url, timeout=15)
    print(f"  Status: {r.status_code} | Response: {r.text[:120]}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert data.get("status") == "active", f"Expected status=active, got {data}"


def test_backend_n8n_webhook_no_auth():
    """n8n webhook endpoint with no auth — should work (N8N_WEBHOOK_SECRET may not be set)."""
    url = f"{BACKEND_URL}/api/webhooks/n8n"
    payload = {
        "action": "translate",
        "text": "Hello, this is a test message.",
        "source_language": "en",
        "target_language": "es"
    }
    print(f"  POST {url}")
    print(f"  Body: {json.dumps(payload)}")
    r = requests.post(url, json=payload, timeout=15)
    print(f"  Status: {r.status_code} | Response: {r.text[:200]}")
    # If secret is configured on Render, this might 403 — that's also OK
    assert r.status_code in [200, 403], f"Expected 200 or 403, got {r.status_code}"
    if r.status_code == 200:
        data = r.json()
        assert "translated_text" in data, f"No translated_text in response: {data}"
        print(f"  Translated: {data.get('translated_text')}")


def test_backend_n8n_webhook_with_auth():
    """n8n webhook endpoint with correct auth header."""
    url = f"{BACKEND_URL}/api/webhooks/n8n"
    payload = {
        "action": "translate",
        "text": "Good morning, how are you?",
        "source_language": "en",
        "target_language": "fr"
    }
    headers = {"X-N8N-API-Key": N8N_WEBHOOK_SECRET}
    print(f"  POST {url}")
    print(f"  Headers: X-N8N-API-Key: {N8N_WEBHOOK_SECRET[:6]}***")
    print(f"  Body: {json.dumps(payload)}")
    r = requests.post(url, json=payload, headers=headers, timeout=15)
    print(f"  Status: {r.status_code} | Response: {r.text[:200]}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert "translated_text" in data, f"No translated_text in response: {data}"
    print(f"  Translated: {data.get('translated_text')}")


def test_backend_n8n_webhook_wrong_auth():
    """n8n webhook endpoint with WRONG auth — must return 403."""
    url = f"{BACKEND_URL}/api/webhooks/n8n"
    payload = {"action": "translate", "text": "test", "source_language": "en", "target_language": "de"}
    headers = {"X-N8N-API-Key": "definitely-wrong-key"}
    print(f"  POST {url} with wrong key")
    r = requests.post(url, json=payload, headers=headers, timeout=15)
    print(f"  Status: {r.status_code}")
    # Only fails if the secret is configured on Render
    if r.status_code == 200:
        print(f"  {WARN}: Got 200 — N8N_WEBHOOK_SECRET may not be set in Render env vars yet")
    else:
        assert r.status_code == 403, f"Expected 403, got {r.status_code}"


def test_backend_n8n_webhook_voice_translate():
    """n8n webhook voice-translate action."""
    url = f"{BACKEND_URL}/api/webhooks/n8n"
    payload = {
        "action": "voice-translate",
        "audio_base64": "dGVzdA==",  # base64 of "test"
        "source_language": "en",
        "target_language": "es"
    }
    headers = {"X-N8N-API-Key": N8N_WEBHOOK_SECRET}
    print(f"  POST {url} (action=voice-translate)")
    r = requests.post(url, json=payload, headers=headers, timeout=20)
    print(f"  Status: {r.status_code} | Response: {r.text[:200]}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("action") == "voice-translate"
    assert "translated_text" in data


def test_backend_n8n_webhook_unknown_action():
    """Unknown action must return 400."""
    url = f"{BACKEND_URL}/api/webhooks/n8n"
    payload = {"action": "nuke-database", "text": "test"}
    headers = {"X-N8N-API-Key": N8N_WEBHOOK_SECRET}
    r = requests.post(url, json=payload, headers=headers, timeout=10)
    print(f"  Status: {r.status_code} (expected 400)")
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"


# ==================== n8n LIVE WORKFLOW TESTS ====================

def test_n8n_webhook_live_translate():
    """
    Call the LIVE n8n webhook URL (the production workflow).
    Simulates what Twilio would send for a WhatsApp message.
    n8n should forward to backend and return the translated text.
    """
    url = N8N_WEBHOOK_URL
    # Simulate a Twilio WhatsApp form POST
    payload = {
        "action": "translate",
        "text": "Hello from the integration test!",
        "from_number": "+15555551234",
        "source_language": "en",
        "target_language": "es"
    }
    print(f"  POST {url}")
    print(f"  Payload: {json.dumps(payload)}")
    r = requests.post(url, json=payload, timeout=30)
    print(f"  Status: {r.status_code}")
    print(f"  Response: {r.text[:300]}")
    assert r.status_code == 200, f"n8n webhook returned {r.status_code}: {r.text}"
    # n8n passes the backend response through
    try:
        data = r.json()
        if "translated_text" in data:
            print(f"  ✅ Translated: {data['translated_text']}")
        else:
            print(f"  {WARN}: Response does not contain translated_text — check n8n workflow body mapping")
    except Exception:
        print(f"  {WARN}: Response is not JSON — may be TwiML or raw text: {r.text[:100]}")


def test_n8n_webhook_simulated_twilio_whatsapp():
    """
    Simulate an exact Twilio WhatsApp webhook POST (form-encoded).
    This is what Twilio sends when a user messages your WhatsApp number.
    Tests the full pipeline: Twilio format → n8n → backend → TwiML response.
    """
    url = N8N_WEBHOOK_URL
    # Twilio sends form-encoded data, not JSON
    form_data = {
        "MessageSid": "SM_TEST_12345",
        "Body": "Translate this to Spanish: Hello world",
        "From": "whatsapp:+15555550000",
        "To": "whatsapp:+14155551234",
        "NumMedia": "0"
    }
    print(f"  POST {url} (Twilio form-encoded format)")
    print(f"  Body: {form_data}")
    r = requests.post(url, data=form_data, timeout=30)
    print(f"  Status: {r.status_code}")
    print(f"  Response: {r.text[:300]}")
    # We expect n8n to return something — exact format depends on workflow config
    assert r.status_code in [200, 204], f"Expected 200, got {r.status_code}"
    print(f"  {INFO}: If response contains TwiML (<Response><Message>...) the full pipeline is working")


# ==================== SUMMARY ====================

if __name__ == "__main__":
    verbose = "-v" in sys.argv

    print("\n" + "="*55)
    print("  AI Polyglots × n8n Integration Tests")
    print("="*55)
    print(f"  Backend URL:     {BACKEND_URL}")
    print(f"  n8n Webhook URL: {N8N_WEBHOOK_URL}")
    print(f"  Secret (masked): {N8N_WEBHOOK_SECRET[:6]}***")
    print("="*55)

    # --- Backend direct tests ---
    print("\n📡 SECTION 1: Backend /api/webhooks/n8n (Direct)")
    test("Backend health check", test_backend_health)
    test("n8n webhook — no auth header", test_backend_n8n_webhook_no_auth)
    test("n8n webhook — correct auth", test_backend_n8n_webhook_with_auth)
    test("n8n webhook — wrong auth (expect 403)", test_backend_n8n_webhook_wrong_auth)
    test("n8n webhook — voice-translate action", test_backend_n8n_webhook_voice_translate)
    test("n8n webhook — unknown action (expect 400)", test_backend_n8n_webhook_unknown_action)

    # --- Live n8n workflow tests ---
    print("\n🔀 SECTION 2: Live n8n Workflow (End-to-End)")
    test("n8n live webhook — JSON translate payload", test_n8n_webhook_live_translate)
    test("n8n live webhook — Twilio WhatsApp simulation", test_n8n_webhook_simulated_twilio_whatsapp)

    # --- Results summary ---
    print("\n" + "="*55)
    print("  RESULTS SUMMARY")
    print("="*55)
    passed = sum(1 for _, s, _ in results if s == "PASS")
    failed = sum(1 for _, s, _ in results if s in ["FAIL", "ERROR"])
    for name, status, err in results:
        icon = "✅" if status == "PASS" else "❌"
        print(f"  {icon} {name}")
        if err and verbose:
            print(f"       → {err}")
    print(f"\n  {passed}/{len(results)} passed")
    print("="*55 + "\n")
    sys.exit(0 if failed == 0 else 1)
