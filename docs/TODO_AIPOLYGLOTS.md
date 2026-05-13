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

- [ ] **Upgrade translation engine from MyMemory → better free alternative**
  - **Why:** MyMemory has a 500 char/req limit and inconsistent quality on technical content.
  - **Free options available (no new cost):**
    | Engine | Cost | Quality | Notes |
    |--------|------|---------|-------|
    | **MyMemory** (current) | Free | ⭐⭐ | 500 char limit, community-powered |
    | **OpenAI GPT-3.5-turbo** | ~$0.001/1k tokens ≈ free | ⭐⭐⭐⭐⭐ | **Already have API key** — best option |
    | **DeepL Free API** | 500k chars/month free | ⭐⭐⭐⭐ | Separate API key needed |
    | **LibreTranslate** | Free (self-hosted) | ⭐⭐⭐ | Requires Render service |
  - **Recommendation:** Use existing `OPENAI_API_KEY` with GPT-3.5-turbo. Already installed, near-zero cost at low volume, vastly better quality.
  - **Status:** ⏳ Deferred — doing n8n channel integration first per decision 2026-05-13.

- [ ] **Harden `/api/translate` error handling**
  - **Why:** Backend occasionally returns 500 errors, causing CORS failures visible to users.
  - **Effort:** Low — try/except wrappers already partially added; needs completion + fallback message.
  - **Status:** Partially done (startup_db hardened). Translate endpoint needs same treatment.

---

## 🟡 High Impact (Do Soon)

- [ ] **Add OpenAI/Anthropic as selectable translation provider in the UI**
  - **Why:** Differentiates from free tools. Users can choose speed vs quality.
  - **Effort:** Medium — UI dropdown + backend routing logic.

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

- [~] **n8n WhatsApp workflow** *(see N8N_INTEGRATION_PLAN.md)*
  - **Why:** Fixes broken WhatsApp integration. Expands reach to mobile-first users.
  - **Status:** Workflow built in n8n, backend endpoint coded. Awaiting Render deploy + Twilio URL update.

- [ ] **n8n Email translation pipeline**
- [ ] **n8n Slack bot**
- [ ] **n8n Health Monitor**
- [ ] **n8n Batch translation job**

- [ ] **Update https://aipolyglots.com website content to reflect new channels**
  - **Trigger:** Do this AFTER n8n WhatsApp + at least one other channel is fully live and tested
  - **What to update:**
    - Hero section: add WhatsApp as an access method (with phone number / QR code)
    - Features section: add "Translate via WhatsApp", "Email Translation", "Slack Bot" feature cards
    - How It Works: update to show the multi-channel diagram
    - Add a dedicated "Get Started on WhatsApp" CTA with the Twilio number
    - Footer: add WhatsApp contact link
  - **Effort:** Medium — frontend-only changes, no backend needed
  - **Files to edit:** `frontend/src/` components (likely `App.jsx` or equivalent)

---

## 🔵 Future / Roadmap

- [ ] **Real-time video conversation translation** *(text, voice, sign language)*
  - High complexity — WebRTC + streaming + sign language model integration.
  - Document requirements before starting.

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
