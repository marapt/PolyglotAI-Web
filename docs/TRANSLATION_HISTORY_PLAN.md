# 📜 Unified Translation History Plan

> **Goal:** Create a persistent, cross-channel history of all translations (Web, WhatsApp, Voice) stored in MongoDB to power a "History" dashboard for users.

---

## 🏗️ Architecture

### 1. Unified Schema
Every translation, regardless of source, will be stored in a single `translations` collection with the following common fields:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Unique identifier for the translation |
| `channel` | `string` | `"web"`, `"whatsapp"`, or `"voice"` |
| `user_identifier` | `string` | IP address (Web) or Phone Number (WhatsApp) |
| `original_text` | `string` | The text before translation |
| `translated_text` | `string` | The text after translation |
| `source_language` | `string` | Detected or specified source language |
| `target_language` | `string` | Target language code |
| `timestamp` | `iso8601` | When the translation occurred |
| `engine` | `string` | `"openai"`, `"mymemory"`, or `"libre"` |

---

## 🛠️ Implementation Steps

### Phase 1: Backend Data Model
- [x] Update `TranslationResponse` and `VoiceTranslationResponse` models to include `channel` and `user_identifier`.
- [x] Create a helper `log_translation_to_db()` to handle unified logging with error handling.

### Phase 2: Route Integration
- [x] **Web:** Update `api_translate_text` to log with `channel="web"` and IP as identifier.
- [x] **WhatsApp:** Update `n8n_webhook` to log with `channel="whatsapp"` and `from_number` as identifier.
- [x] **Voice:** Update `voice_translate` to log with `channel="voice"`.

### Phase 3: History API
- [x] Update `GET /api/history` to support filtering by `user_identifier` (optional).
- [x] Ensure the results are sorted by `timestamp` descending.

---

## ✅ Benefits
*   **Omnichannel View:** Users can see their WhatsApp translations on the website and vice versa.
*   **Analytics:** Easy to see which channels are most popular and which languages are being used.
*   **Growth:** Foundation for "Saved Translations" and "Flashcards" features.
