# 🚀 AI Polyglots: High-Yield Improvements Backlog

> Tasks ordered by **estimated user impact** vs **effort**.  
> Revisit this list before starting any new feature work to ensure we're always working on the highest-value item first.
>
> **Last Updated:** 2026-05-13

---

## 📋 Status Legend
- `[ ]` — Not started
- `[~]` — In progress  
- `[x]` — Complete
- `[!]` — Blocked

---

## 🔴 Critical (Fix Before Adding Features)

- [x] **Upgrade translation engine from MyMemory → OpenAI (gpt-4o-mini)**
  - **Why:** MyMemory has a 500 char/req limit and inconsistent quality on technical content.
  - **Status:** ✅ Fixed (OpenAI gpt-4o-mini integrated as Tier 1, with MyMemory/LibreTranslate as fallbacks).
  - **Safety:** 🛡️ Added `DISABLE_PAID_ENGINES` toggle (defaults to `true`). You must explicitly enable this in Render to use OpenAI, ensuring zero unexpected costs.

- [x] **Harden `/api/translate` error handling**
  - **Why:** Backend occasionally returns 500 errors, causing CORS failures visible to users.
  - **Effort:** Low — try/except wrappers already partially added; needs completion + fallback message.
  - **Status:** ✅ Fixed (db truthiness bug resolved, LibreTranslate fallback logic implemented).

---

## 🟡 High Impact (Do Soon)

- [ ] **Add OpenAI/Anthropic as selectable translation provider in the UI**
  - **Why:** Differentiates from free tools. Users can choose speed vs quality.
  - **Effort:** Medium — UI dropdown + backend routing logic.

- [ ] **WhatsApp: Smart Locale & User Memory** *(see WHATSAPP_LOCALE_MEMORY.md)*
  - **Why:** Removes friction. Auto-detects target language based on user's country code (e.g., `+55` -> Portuguese) and allows persistent MongoDB overrides ("set my language to French").
  - **Effort:** Medium — MongoDB `user_preferences` collection + Python `phonenumbers` library parsing.

- [ ] **Add translation quality indicator / confidence score**
  - **Why:** Helps users know when to trust the output vs review manually.
  - **Effort:** Medium — can be approximated using back-translation comparison.

- [ ] **Persist translation history per user (MongoDB)**
  - **Why:** Lets users revisit past translations without re-submitting.
  - **Effort:** Low — MongoDB collection + history endpoint already stubbed in `server.py`.

- [ ] **Add character/word count and cost estimator**
  - **Why:** Transparency about cost before submitting (especially important once paid engines are live).
  - **Effort:** Low.

---

## 🟢 Growth / Distribution (Do After Core Is Solid)

- [x] **n8n WhatsApp workflow** *(see N8N_INTEGRATION_PLAN.md)*
  - **Why:** Fixes broken WhatsApp integration. Expands reach to mobile-first users.
  - **Status:** ✅ Fully LIVE. Webhook running via n8n, rendering natural language parser & custom welcome message.

- [ ] **WhatsApp: Production Twilio Number**
  - **Why:** Removes the sandbox `join subject-birth` barrier, enabling a true "click link and go" BYOP experience.
  - **Effort:** External — Requires Meta Business verification and Twilio application.

- [ ] **n8n Email translation pipeline**
- [ ] **n8n Slack bot**
- [x] **n8n Health Monitor**
  - **Why:** Prevents Render cold starts.
  - **Status:** ✅ Endpoint `/api/health/keep-alive` implemented. Documentation created in `N8N_HEALTH_MONITOR.md`.
- [ ] **n8n Batch translation job**

- [x] **Update https://aipolyglots.com website content to reflect new channels**
  - **Trigger:** Do this AFTER n8n WhatsApp + at least one other channel is fully live and tested
  - **What to update:**
    - Hero section: add WhatsApp as an access method (with phone number / QR code)
    - Features section: add "Translate via WhatsApp", "Email Translation", "Slack Bot" feature cards
    - How It Works: update to show the multi-channel diagram
    - Add a dedicated "Get Started on WhatsApp" CTA with the Twilio number
    - Footer: add WhatsApp contact link
  - **Effort:** Medium — frontend-only changes, no backend needed
  - **Status:** ✅ Added WhatsApp try-it button with BYOP (Bring Your Own Phone) framing to `Integrations.js`.

---

## 🔵 Future / Roadmap

- [ ] **Real-time video conversation translation** *(text, voice, sign language)*
  - High complexity — WebRTC + streaming + sign language model integration.
  - Document requirements before starting.

- [ ] **WhatsApp: Relay / Proxy Model** *(see WHATSAPP_STRATEGY.md)*
  - **Why:** Evolves the bot from a "personal translator" (Bot Model) to a "real-time communication bridge" between two real users.
  - **Effort:** High — requires session management, pairing codes ("Room ID"), and outbound messaging logic.

- [ ] **Glossary enforcement** (ensure custom terms survive translation)
- [ ] **XLIFF/PO file round-trip quality validation**
- [ ] **Multi-language batch (translate one file to 5 languages simultaneously)**

---

## 💡 Learnings Log

| Date | Insight |
|------|---------|
| 2026-05-13 | Before expanding channels (n8n), upgrade the translation engine. More channels amplify quality problems, not solve them. |
| 2026-05-13 | MyMemory free tier has a 500 char/req limit and returns degraded results on technical content. Not production-grade for a serious localization tool. |
| 2026-05-13 | The OpenAI SDK is already installed in the backend — switching translation engine is low-effort, high-reward. |
