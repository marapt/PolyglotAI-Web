"""
Backend API Tests for Polyglot AI - Iteration 5: Security Hardening
Tests: SHA-256 hashed keys, one-time key display, rate limiting, daily caps, scoped permissions, key revocation
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Store generated API keys for tests
test_keys = {}


class TestApiKeyGeneration:
    """API Key generation with new security features"""
    
    def test_generate_key_returns_full_key_with_pk_prefix(self):
        """Test POST /api/keys/generate creates key with pk_ prefix and returns full key once"""
        global test_keys
        payload = {
            "name": f"TEST_security_key_{int(time.time())}",
            "scope": "translate",
            "rate_limit": 30,
            "daily_cap": 1000
        }
        response = requests.post(f"{BASE_URL}/api/keys/generate", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "name" in data
        assert "key" in data
        assert "scope" in data
        assert "rate_limit" in data
        assert "daily_cap" in data
        assert "created_at" in data
        
        # Verify key format - must start with pk_
        assert data["key"].startswith("pk_"), f"Key should start with pk_, got: {data['key'][:10]}"
        assert len(data["key"]) > 20, "Key should be at least 20 chars"
        
        # Verify scope, rate_limit, daily_cap are returned
        assert data["scope"] == "translate"
        assert data["rate_limit"] == 30
        assert data["daily_cap"] == 1000
        
        # Store for later tests
        test_keys["translate_key"] = data
        
        print(f"SUCCESS: Generated API key: {data['key'][:15]}... with scope={data['scope']}, rate_limit={data['rate_limit']}, daily_cap={data['daily_cap']}")
    
    def test_generate_key_with_custom_scope_rate_cap(self):
        """Test key generation accepts scope, rate_limit, daily_cap parameters"""
        global test_keys
        payload = {
            "name": f"TEST_full_access_{int(time.time())}",
            "scope": "full",
            "rate_limit": 60,
            "daily_cap": 5000
        }
        response = requests.post(f"{BASE_URL}/api/keys/generate", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["scope"] == "full"
        assert data["rate_limit"] == 60
        assert data["daily_cap"] == 5000
        
        test_keys["full_key"] = data
        print(f"SUCCESS: Generated full-access key with rate_limit=60, daily_cap=5000")
    
    def test_generate_readonly_key(self):
        """Test generating a read-only scoped key"""
        global test_keys
        payload = {
            "name": f"TEST_readonly_{int(time.time())}",
            "scope": "read-only",
            "rate_limit": 10,
            "daily_cap": 100
        }
        response = requests.post(f"{BASE_URL}/api/keys/generate", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["scope"] == "read-only"
        test_keys["readonly_key"] = data
        print(f"SUCCESS: Generated read-only key")


class TestKeyMasking:
    """Test that keys are masked in GET /api/keys"""
    
    def test_list_keys_returns_masked_values(self):
        """Test GET /api/keys returns keys with masked values (never full key)"""
        # First ensure we have at least one key
        if not test_keys.get("translate_key"):
            payload = {"name": f"TEST_mask_test_{int(time.time())}", "scope": "translate"}
            res = requests.post(f"{BASE_URL}/api/keys/generate", json=payload)
            test_keys["translate_key"] = res.json()
        
        response = requests.get(f"{BASE_URL}/api/keys")
        assert response.status_code == 200
        data = response.json()
        
        assert "keys" in data
        assert isinstance(data["keys"], list)
        assert len(data["keys"]) > 0, "Should have at least one key"
        
        # Verify keys are masked
        for key in data["keys"]:
            assert "key_masked" in key, "Response should have key_masked field"
            masked = key["key_masked"]
            
            # Masked key should have asterisks or bullets
            assert "*" in masked or "•" in masked, f"Key should be masked, got: {masked}"
            
            # Full key should NOT be in response
            assert "key" not in key or key.get("key") == key.get("key_masked"), "Full key should not be returned"
            
            # Verify other fields
            assert "name" in key
            assert "scope" in key
            assert "id" in key
            
        print(f"SUCCESS: Listed {len(data['keys'])} keys - all properly masked")
    
    def test_masked_key_shows_prefix_and_suffix(self):
        """Test masked key shows pk_ prefix and last 4 chars"""
        response = requests.get(f"{BASE_URL}/api/keys")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["keys"]) > 0:
            masked = data["keys"][0]["key_masked"]
            # Should start with pk_ prefix
            assert masked.startswith("pk_"), f"Masked key should start with pk_, got: {masked[:10]}"
            print(f"SUCCESS: Masked key format correct: {masked}")


class TestKeyAuthentication:
    """Test API key authentication for /api/v1/translate"""
    
    def test_translate_with_valid_key_works(self):
        """Test generated key works for /api/v1/translate with X-Api-Key header"""
        global test_keys
        if not test_keys.get("translate_key"):
            payload = {"name": f"TEST_auth_{int(time.time())}", "scope": "translate"}
            res = requests.post(f"{BASE_URL}/api/keys/generate", json=payload)
            test_keys["translate_key"] = res.json()
        
        api_key = test_keys["translate_key"]["key"]
        
        payload = {
            "text": "Hello, world!",
            "source_language": "en",
            "target_language": "es"
        }
        response = requests.post(
            f"{BASE_URL}/api/v1/translate",
            json=payload,
            headers={"X-Api-Key": api_key}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "translated_text" in data
        assert len(data["translated_text"]) > 0
        print(f"SUCCESS: Translation with valid key: '{data['translated_text']}'")
    
    def test_translate_without_key_returns_401(self):
        """Test API returns 401 for missing API key"""
        payload = {
            "text": "Hello",
            "source_language": "en",
            "target_language": "es"
        }
        response = requests.post(f"{BASE_URL}/api/v1/translate", json=payload)
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Missing" in data["detail"] or "API key" in data["detail"]
        print(f"SUCCESS: Missing key returns 401: {data['detail']}")
    
    def test_translate_with_invalid_key_returns_401(self):
        """Test API returns 401 for invalid API key"""
        payload = {
            "text": "Hello",
            "source_language": "en",
            "target_language": "es"
        }
        response = requests.post(
            f"{BASE_URL}/api/v1/translate",
            json=payload,
            headers={"X-Api-Key": "pk_invalid_key_12345678901234567890"}
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Invalid" in data["detail"]
        print(f"SUCCESS: Invalid key returns 401: {data['detail']}")


class TestScopeEnforcement:
    """Test key scope enforcement"""
    
    def test_translate_scope_can_translate(self):
        """Test translate scope can use /api/v1/translate"""
        global test_keys
        if not test_keys.get("translate_key"):
            payload = {"name": f"TEST_scope_translate_{int(time.time())}", "scope": "translate"}
            res = requests.post(f"{BASE_URL}/api/keys/generate", json=payload)
            test_keys["translate_key"] = res.json()
        
        api_key = test_keys["translate_key"]["key"]
        
        payload = {
            "text": "Test scope",
            "source_language": "en",
            "target_language": "fr"
        }
        response = requests.post(
            f"{BASE_URL}/api/v1/translate",
            json=payload,
            headers={"X-Api-Key": api_key}
        )
        assert response.status_code == 200
        print(f"SUCCESS: translate scope can translate")
    
    def test_readonly_scope_cannot_translate(self):
        """Test read-only scope cannot use /api/v1/translate"""
        global test_keys
        if not test_keys.get("readonly_key"):
            payload = {"name": f"TEST_scope_readonly_{int(time.time())}", "scope": "read-only"}
            res = requests.post(f"{BASE_URL}/api/keys/generate", json=payload)
            test_keys["readonly_key"] = res.json()
        
        api_key = test_keys["readonly_key"]["key"]
        
        payload = {
            "text": "Test readonly",
            "source_language": "en",
            "target_language": "fr"
        }
        response = requests.post(
            f"{BASE_URL}/api/v1/translate",
            json=payload,
            headers={"X-Api-Key": api_key}
        )
        # Should return 403 Forbidden due to insufficient scope
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        data = response.json()
        assert "scope" in data["detail"].lower() or "insufficient" in data["detail"].lower()
        print(f"SUCCESS: read-only scope cannot translate: {data['detail']}")
    
    def test_full_scope_can_translate(self):
        """Test full scope can use /api/v1/translate"""
        global test_keys
        if not test_keys.get("full_key"):
            payload = {"name": f"TEST_scope_full_{int(time.time())}", "scope": "full"}
            res = requests.post(f"{BASE_URL}/api/keys/generate", json=payload)
            test_keys["full_key"] = res.json()
        
        api_key = test_keys["full_key"]["key"]
        
        payload = {
            "text": "Test full access",
            "source_language": "en",
            "target_language": "de"
        }
        response = requests.post(
            f"{BASE_URL}/api/v1/translate",
            json=payload,
            headers={"X-Api-Key": api_key}
        )
        assert response.status_code == 200
        print(f"SUCCESS: full scope can translate")


class TestRateLimiting:
    """Test per-key rate limiting"""
    
    def test_rate_limit_returns_429_when_exceeded(self):
        """Test rate limiting returns 429 when exceeded"""
        # Generate a key with very low rate limit (2 req/min)
        payload = {
            "name": f"TEST_rate_limit_{int(time.time())}",
            "scope": "translate",
            "rate_limit": 2,
            "daily_cap": 1000
        }
        res = requests.post(f"{BASE_URL}/api/keys/generate", json=payload)
        assert res.status_code == 200
        api_key = res.json()["key"]
        
        translate_payload = {
            "text": "Rate limit test",
            "source_language": "en",
            "target_language": "es"
        }
        
        # Make requests rapidly to exceed rate limit
        responses = []
        for i in range(5):
            response = requests.post(
                f"{BASE_URL}/api/v1/translate",
                json=translate_payload,
                headers={"X-Api-Key": api_key}
            )
            responses.append(response.status_code)
            # Small delay to avoid overwhelming
            time.sleep(0.1)
        
        # At least one should be 429 (rate limited)
        assert 429 in responses, f"Expected at least one 429 response, got: {responses}"
        
        # Verify 429 response has proper detail
        for i, status in enumerate(responses):
            if status == 429:
                # Re-make request to get the response body
                response = requests.post(
                    f"{BASE_URL}/api/v1/translate",
                    json=translate_payload,
                    headers={"X-Api-Key": api_key}
                )
                if response.status_code == 429:
                    data = response.json()
                    assert "detail" in data
                    assert "rate" in data["detail"].lower() or "limit" in data["detail"].lower()
                    print(f"SUCCESS: Rate limit exceeded returns 429: {data['detail']}")
                    break
        
        print(f"SUCCESS: Rate limiting works - responses: {responses}")


class TestDailyCap:
    """Test daily usage cap enforcement"""
    
    def test_daily_cap_enforcement(self):
        """Test daily cap enforcement works"""
        # Generate a key with very low daily cap (3 requests)
        payload = {
            "name": f"TEST_daily_cap_{int(time.time())}",
            "scope": "translate",
            "rate_limit": 100,  # High rate limit so we don't hit that first
            "daily_cap": 3
        }
        res = requests.post(f"{BASE_URL}/api/keys/generate", json=payload)
        assert res.status_code == 200
        api_key = res.json()["key"]
        
        translate_payload = {
            "text": "Daily cap test",
            "source_language": "en",
            "target_language": "es"
        }
        
        # Make requests to exceed daily cap
        responses = []
        for i in range(6):
            response = requests.post(
                f"{BASE_URL}/api/v1/translate",
                json=translate_payload,
                headers={"X-Api-Key": api_key}
            )
            responses.append(response.status_code)
            time.sleep(0.2)  # Small delay
        
        # After 3 successful requests, should get 429
        success_count = responses.count(200)
        rate_limited_count = responses.count(429)
        
        assert success_count <= 3, f"Should have at most 3 successful requests, got {success_count}"
        assert rate_limited_count > 0, f"Should have at least one 429 response, got: {responses}"
        
        print(f"SUCCESS: Daily cap enforcement works - {success_count} successful, {rate_limited_count} rate limited")


class TestKeyRevocation:
    """Test key revocation"""
    
    def test_revoke_key_works(self):
        """Test DELETE /api/keys/{id} revokes a key"""
        # Generate a key to revoke
        payload = {
            "name": f"TEST_revoke_{int(time.time())}",
            "scope": "translate"
        }
        res = requests.post(f"{BASE_URL}/api/keys/generate", json=payload)
        assert res.status_code == 200
        key_data = res.json()
        key_id = key_data["id"]
        api_key = key_data["key"]
        
        # Verify key works before revocation
        translate_payload = {
            "text": "Before revoke",
            "source_language": "en",
            "target_language": "es"
        }
        response = requests.post(
            f"{BASE_URL}/api/v1/translate",
            json=translate_payload,
            headers={"X-Api-Key": api_key}
        )
        assert response.status_code == 200, "Key should work before revocation"
        
        # Revoke the key
        revoke_response = requests.delete(f"{BASE_URL}/api/keys/{key_id}")
        assert revoke_response.status_code == 200
        revoke_data = revoke_response.json()
        assert revoke_data["status"] == "revoked"
        assert revoke_data["key_id"] == key_id
        print(f"SUCCESS: Key revoked: {revoke_data}")
        
        # Verify key no longer works after revocation
        response = requests.post(
            f"{BASE_URL}/api/v1/translate",
            json=translate_payload,
            headers={"X-Api-Key": api_key}
        )
        assert response.status_code == 401, f"Revoked key should return 401, got {response.status_code}"
        print(f"SUCCESS: Revoked key returns 401")
    
    def test_revoke_nonexistent_key_returns_404(self):
        """Test revoking non-existent key returns 404"""
        response = requests.delete(f"{BASE_URL}/api/keys/nonexistent-key-id-12345")
        assert response.status_code == 404
        print(f"SUCCESS: Non-existent key revocation returns 404")
    
    def test_revoked_key_not_in_active_list(self):
        """Test revoked key does not appear in GET /api/keys"""
        # Generate and revoke a key
        payload = {"name": f"TEST_revoke_list_{int(time.time())}", "scope": "translate"}
        res = requests.post(f"{BASE_URL}/api/keys/generate", json=payload)
        key_data = res.json()
        key_id = key_data["id"]
        
        # Revoke it
        requests.delete(f"{BASE_URL}/api/keys/{key_id}")
        
        # Check it's not in the list
        response = requests.get(f"{BASE_URL}/api/keys")
        data = response.json()
        
        key_ids = [k["id"] for k in data["keys"]]
        assert key_id not in key_ids, "Revoked key should not appear in active keys list"
        print(f"SUCCESS: Revoked key not in active list")


class TestApiDocsSecurityInfo:
    """Test API docs include security information"""
    
    def test_docs_include_security_info(self):
        """Test GET /api/docs/endpoints includes security documentation"""
        response = requests.get(f"{BASE_URL}/api/docs/endpoints")
        assert response.status_code == 200
        data = response.json()
        
        # Verify security section exists
        assert "security" in data, "API docs should include security section"
        security = data["security"]
        
        # Verify key security info
        assert "key_hashing" in security or "hashing" in str(security).lower()
        assert "rate_limiting" in security or "rate" in str(security).lower()
        assert "scopes" in security
        
        print(f"SUCCESS: API docs include security info: {list(security.keys())}")


class TestCoreTranslationStillWorks:
    """Verify existing translation features still work"""
    
    def test_internal_translate_endpoint_works(self):
        """Test /api/translate (internal, no auth) still works"""
        payload = {
            "text": "Hello world",
            "source_language": "English",
            "target_language": "Spanish"
        }
        response = requests.post(f"{BASE_URL}/api/translate", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "translated_text" in data
        assert "original_text" in data
        assert data["original_text"] == "Hello world"
        print(f"SUCCESS: Internal translate endpoint works: {data['translated_text']}")
    
    def test_supported_languages_works(self):
        """Test /api/supported-languages still works"""
        response = requests.get(f"{BASE_URL}/api/supported-languages")
        assert response.status_code == 200
        data = response.json()
        
        assert "spoken_languages" in data
        assert "sign_languages" in data
        assert len(data["spoken_languages"]) > 50
        print(f"SUCCESS: Supported languages endpoint works")
    
    def test_history_endpoint_works(self):
        """Test /api/history still works"""
        response = requests.get(f"{BASE_URL}/api/history")
        assert response.status_code == 200
        data = response.json()
        
        assert "history" in data
        assert "count" in data
        print(f"SUCCESS: History endpoint works with {data['count']} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
