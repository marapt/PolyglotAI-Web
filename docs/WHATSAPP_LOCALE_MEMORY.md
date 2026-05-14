# 🧠 WhatsApp Smart Locale & User Memory Plan

> **Goal:** Eliminate the need for users to manually specify target languages by using intelligent defaults based on their phone number, with the ability to override via persistent memory.
> **Branch:** `feature/n8n-integration`
> **Status:** ✅ Implemented (v1.0)
> **Safety:** 🛡️ Zero-Cost by Default (via `DISABLE_PAID_ENGINES` toggle)

---

## 💡 The "Zero-Configuration" UX



When a user messages the bot without specifying a target language (e.g., they just send a forwarded message), the system needs a smart way to decide what language to translate it *into*.

Instead of defaulting to English for everyone, the system will use a two-tier hierarchy:

1. **Tier 1 (The Override): User Memory (MongoDB)**
   If the user has explicitly told the bot their preferred language in the past (e.g., "translate everything to Spanish"), the bot will always use that preference.

2. **Tier 2 (The Smart Default): Country Code Inference**
   If the user has no saved preference, the bot parses their WhatsApp phone number (e.g., `+55...` for Brazil), looks up the primary language for that region (Portuguese), and translates the message into that language.

3. **Tier 3 (Absolute Fallback): English**
   If the country code is ambiguous (e.g., `+1` could be English or French Canadian, though we'll default to English) or the inference fails, it falls back to English.

---

## 🛠️ Implementation Steps

### Phase 1: Number Parsing & Country Defaulting
- [x] Install `phonenumbers` Python library (`pip install phonenumbers`).
- [x] Create a `utils/locale_helper.py` utility to:
  - Parse the E.164 `from_number` string (e.g., `whatsapp:+525512345678`).
  - Extract the ISO country code (e.g., `MX`).
  - Map the country code to a target language code (e.g., `es`).
- [x] Integrate the fallback logic into the `parse_whatsapp_message` routing in `server.py`.

### Phase 2: MongoDB User Memory (Overrides)
- [x] Create a `user_preferences` collection in the MongoDB database.
- [x] Add natural language detection for setting preferences (e.g., "set my language to French", "always translate to German").
- [x] Write logic to upsert `from_number -> target_language` into MongoDB when a user sets a preference.
- [x] Update the translation route to query MongoDB first before relying on the Country Code default.

### Phase 3: Testing & Edge Cases
- [x] Write unit tests for the `locale_helper.py` mapping (testing various country prefixes).
- [x] Ensure the welcome message (`is_greeting`) still triggers normally.
- [x] Update the welcome message text to inform the user what their detected default language is (e.g., "I'll translate messages to Spanish based on your number. You can change this anytime...").

---

## 🗺️ Example Scenarios

| User Phone Number | User Sends | Database Record | System Action | Result |
|-------------------|------------|-----------------|---------------|--------|
| `+55...` (Brazil) | "Hello, how are you?" | *None* | Infers Brazil → Portuguese | Translates to Portuguese |
| `+33...` (France) | "Where is the train?" | *None* | Infers France → French | Translates to French |
| `+1...` (USA) | "set language to Japanese" | *Creates record* | Saves `ja` to MongoDB | Replies "Preference saved!" |
| `+1...` (USA) | "Thank you very much" | `target: ja` | Reads MongoDB override | Translates to Japanese |

---

## ✅ Build Status (v1.0)
- [x] Phase 1: Number Parsing & Country Defaulting
- [x] Phase 2: MongoDB User Memory (Overrides)
- [x] Phase 3: Engine Upgrade (OpenAI with free fallbacks)
- [ ] Phase 4: Production Twilio Number (External)

