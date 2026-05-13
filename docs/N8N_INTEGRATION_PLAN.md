# 🔗 AI Polyglots × n8n Integration Plan
> **Branch:** `feature/n8n-integration`  
> **Target:** Merge to `main` only when all tasks marked ✅ and E2E tests pass  
> **Last Updated:** 2026-05-13

---

## 📋 Progress Legend
- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Complete
- `[!]` — Blocked / needs user action

---

## 🏗️ Phase 0: Setup & Prerequisites

### Repo & Branch
- [x] Create `feature/n8n-integration` branch from `main`
- [ ] Confirm branch is tracking on remote: `git push -u origin feature/n8n-integration`

### n8n Account (⚠️ USER ACTION REQUIRED)
- [!] Sign up at https://n8n.io (free cloud tier — 5 workflows, 2500 executions/month)
- [!] Note your **webhook base URL** (format: `https://[name].app.n8n.cloud/webhook/...`)
- [!] Note your **n8n API key** (Settings → API → Create Key)

---

## 🔧 Phase 1: Backend Changes (AI Polyglots `server.py`)

### 1.1 Generic n8n Webhook Endpoint
- [ ] Add `POST /api/webhooks/n8n` endpoint to `server.py`
  - Accepts JSON payload from n8n
  - Routes to translate/voice/sign handler based on `action` field
  - Returns JSON result back to n8n

### 1.2 API Key Security
- [ ] Add `X-N8N-API-Key` header validation to the n8n webhook endpoint
- [ ] Generate a dedicated internal API key for n8n→backend auth (store in Render env vars as `N8N_WEBHOOK_SECRET`)

### 1.3 CORS Update
- [ ] Add n8n cloud domain to allowed origins in CORS middleware
  - e.g., `https://[name].app.n8n.cloud`

### 1.4 Backend Tests
- [ ] Add pytest test for `POST /api/webhooks/n8n` with a mock translation payload
- [ ] Confirm test passes locally: `pytest tests/test_api.py -v`

---

## 🔀 Phase 2: n8n Workflow Builds (⚠️ REQUIRES n8n ACCOUNT)

### 2.1 WhatsApp Translation Workflow (Priority 1)
- [ ] Create new workflow: **"WhatsApp Inbound Translation"**
- [ ] Add **Webhook** trigger node (copy URL — this replaces the current Twilio webhook)
- [ ] Add **HTTP Request** node → `POST https://aipolyglots-api.onrender.com/api/webhooks/n8n`
  - Body: `{ "action": "translate", "text": "{{$json.Body}}", "from": "{{$json.From}}" }`
  - Header: `X-N8N-API-Key: [N8N_WEBHOOK_SECRET]`
- [ ] Add **Twilio** node → send translated text back as WhatsApp reply
- [ ] Activate workflow
- [ ] Update Twilio webhook URL to point to the new n8n webhook URL

### 2.2 Email Translation Pipeline (Priority 2)
- [ ] Create workflow: **"Email Inbound Translation"**
- [ ] Trigger: Gmail / SendGrid webhook on new email received
- [ ] Parse email body → call `/api/webhooks/n8n` with `action: translate`
- [ ] Reply with translated content via Gmail node

### 2.3 API Health Monitor (Priority 3)
- [ ] Create workflow: **"AI Polyglots Health Monitor"**
- [ ] Trigger: Cron every 5 minutes
- [ ] HTTP Request to `GET https://aipolyglots-api.onrender.com/api/`
- [ ] If NOT 200 → send Slack/email alert
- [ ] Activate workflow

### 2.4 Batch Translation Job (Priority 4)
- [ ] Create workflow: **"Scheduled Batch Translations"**
- [ ] Trigger: Cron daily 6am
- [ ] Query MongoDB for pending translation jobs
- [ ] Loop + call `/api/webhooks/n8n` for each
- [ ] Update records with results

---

## ✅ Phase 3: End-to-End Testing

### 3.1 WhatsApp Flow
- [ ] Send test WhatsApp message to Twilio number
- [ ] Confirm message arrives at n8n webhook (check n8n executions log)
- [ ] Confirm `/api/webhooks/n8n` receives the call (check Render logs)
- [ ] Confirm translated reply is received on WhatsApp

### 3.2 API Monitor
- [ ] Manually trigger health check workflow
- [ ] Confirm success response logged
- [ ] Temporarily break the API, confirm alert fires

### 3.3 Regression Tests
- [ ] Run full pytest suite: `pytest tests/ -v`
- [ ] All existing tests still pass
- [ ] New n8n webhook test passes

---

## 🚀 Phase 4: Deployment to Production

### Pre-Merge Checklist
- [ ] All Phase 1, 2, 3 tasks marked `[x]`
- [ ] `pytest tests/ -v` — all green
- [ ] Render env var `N8N_WEBHOOK_SECRET` set in dashboard
- [ ] Twilio webhook URL updated to n8n URL (NOT pointing directly to backend anymore)
- [ ] CORS verified (n8n calls not blocked)

### Merge Steps
```bash
git checkout main
git merge feature/n8n-integration
git push origin main
```

- [ ] Merge PR on GitHub: `feature/n8n-integration` → `main`
- [ ] Confirm Render auto-deploys from main
- [ ] Confirm Vercel frontend still loads (no regressions)
- [ ] Send one final WhatsApp test message on production

---

## 📝 Notes & Decisions Log

| Date | Decision | Outcome |
|------|----------|---------|
| 2026-05-13 | Scoped Phase 1 to WhatsApp first | Agreed — highest priority since it's broken on live site |
| 2026-05-13 | Hosting: n8n cloud (free tier) for MVP | Revisit self-hosted on Render post-launch |
| 2026-05-13 | Auth: dedicated `N8N_WEBHOOK_SECRET` header | Keeps it isolated from user-facing API keys |

---

## 🔗 References
- [n8n cloud signup](https://n8n.io)
- [Existing architecture notes](./n8n_architecture.md)
- [AI Polyglots backend](../backend/server.py)
- [Test suite](../tests/test_api.py)
- [Render dashboard](https://dashboard.render.com)
