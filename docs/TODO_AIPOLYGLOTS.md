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

- [ ] **Upgrade translation engine from MyMemory → OpenAI/Anthropic**
  - **Why:** MyMemory is a free, community-powered engine with inconsistent quality, character limits, and no domain specialization. Users trying to translate technical, legal, or medical content will get poor results.
  - **Impact:** This is the single highest-leverage change. Better output quality = more retention, more trust.
  - **Effort:** Low — the OpenAI SDK is already in the codebase. Needs `OPENAI_API_KEY` wired to the translate endpoint.
  - **Risk of NOT doing this:** All n8n channel work (WhatsApp, Email, Slack) routes more users to a poor-quality engine.

- [ ] **Harden `/api/translate` error handling**
  - **Why:** Backend occasionally returns 500 errors, causing CORS failures visible to users.
  - **Impact:** Every 500 error is a lost user. Fixing this makes the whole app more reliable.
  - **Effort:** Low — try/except wrappers already partially added; needs completion + fallback message.
  - **Status:** Partially done (startup_db hardened). Translate endpoint itself needs similar treatment.

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

- [ ] **n8n WhatsApp workflow** *(see N8N_INTEGRATION_PLAN.md)*
  - **Why:** Fixes broken WhatsApp integration. Expands reach to mobile-first users.
  - **Pre-requisite:** Translation engine upgrade should happen first.

- [ ] **n8n Email translation pipeline**
- [ ] **n8n Slack bot**
- [ ] **n8n Health Monitor**
- [ ] **n8n Batch translation job**

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
