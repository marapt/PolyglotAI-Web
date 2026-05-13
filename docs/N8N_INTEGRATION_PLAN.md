# 🔗 AI Polyglots × n8n Integration Plan
> **Branch:** `feature/n8n-integration`  
> **Target:** Merge to `main` only when all tasks marked `[x]` and E2E tests pass  
> **Last Updated:** 2026-05-13

---

## 📊 Before & After: What n8n Changes

### Current State (Before n8n)

| Area | Current Behaviour | Problem |
|------|------------------|---------|
| **WhatsApp** | Hardcoded Twilio webhook in `server.py` (~50 lines) | Broken in production. Any fix requires a code deploy. |
| **Voice** | Hardcoded Twilio webhook in `server.py` | Works but tightly coupled. Hard to modify or extend. |
| **Email** | Not implemented | No way to receive translation requests via email. |
| **Slack** | Not implemented | No way to reach the translation engine from Slack. |
| **Monitoring** | None | No alerts if the backend goes down on Render. |
| **New channels** | Each requires new FastAPI route + Twilio/SDK code + deploy | High friction to expand reach. |

### Future State (After n8n)

| Area | New Behaviour | Improvement |
|------|--------------|-------------|
| **WhatsApp** | n8n receives Twilio webhook → calls backend → replies | Fixed and decoupled. Change behaviour in n8n UI, no code deploy needed. |
| **Email** | Gmail/SendGrid → n8n → translate → reply | New channel live with ~20 mins of n8n config. |
| **Slack** | Slash command → n8n → translate → post reply | Adds a B2B/team-friendly entry point. |
| **Monitoring** | 5-min cron → health check → alert | Know about outages before users do. |
| **New channels** | Add a new n8n workflow node | Telegram, Teams, etc. in minutes — no backend code. |

---

## 🧠 Learnings & Honest Assessment

### Is n8n actually improving the product?

**Short answer: It improves *distribution*, not *product quality*.**

| What it improves | What it doesn't improve |
|-----------------|------------------------|
| ✅ Number of channels users can reach the translator through | ❌ Translation quality (still using MyMemory free API) |
| ✅ Operational reliability (monitoring, alerts) | ❌ Core UX on aipolyglots.com — website experience is unchanged |
| ✅ Developer velocity for adding new integrations | ❌ Retention or conversion — new channels don't fix underlying product gaps |
| ✅ Fixes the broken WhatsApp integration | ❌ Doesn't add any AI/ML capability |

### When is this the right investment?

n8n makes sense **if** the translation quality is already good enough that more users would use it if only they could reach it more easily (WhatsApp, email, Slack). If the core product on aipolyglots.com still has reliability issues (500 errors, slow responses, poor quality), those are higher-priority fixes than adding channels.

**Current risk:** We're routing more users to a backend that sometimes returns 500 errors and uses a free translation engine (MyMemory). More channels = more surface area for failures.

### Recommended sequencing (honest priority order)

1. **First:** Ensure the core `/api/translate` endpoint is rock-solid with proper error handling and a quality translation engine (OpenAI/Anthropic)
2. **Then:** Add n8n to expand reach — because now more users hitting the system will have a good experience
3. **Not yet:** Batch jobs and Slack are nice-to-haves; focus on WhatsApp + monitoring first

### What this adds to your portfolio/demo story

- Shows understanding of **workflow orchestration** and **agentic pipelines** — relevant to AgenticLab brand
- Demonstrates **multi-channel API design** thinking
- n8n is widely used in enterprise — good talking point for GTM/BD conversations

---

## 📋 Progress Legend
- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Complete
- `[!]` — Blocked / needs user action

## 🏗️ Phase 0: Architecture Decisions

### Decision 1: n8n Hosting

| Option | Cost | Setup Time | Workflows | Executions/mo | Verdict |
|--------|------|-----------|-----------|--------------|---------|
| **n8n Cloud Free** | $0 | 5 mins | **5 max** | 2,500 | ✅ Start here (MVP) |
| **n8n Cloud Paid** | $20/mo | 5 mins | Unlimited | 5,000+ | Good for growth |
| **Self-hosted on Render** | ~$7/mo (Postgres) | ~1 hr | Unlimited | Unlimited | Best long-term |

> ⚠️ **Free tier has 5 workflow limit.** Our plan has 4 workflows (WhatsApp, Email, Monitor, Batch) so free tier works for MVP. If you add more channels later, upgrade to paid or self-host.
>
> ✅ **Render stays as-is.** Self-hosting n8n on Render means adding a *second* service alongside the existing FastAPI backend — it does NOT replace or affect your current backend. Vercel (frontend) is completely unaffected by n8n regardless of hosting choice.

**Selected:** n8n Cloud Free Tier → migrate to self-hosted Render when workflows exceed 4.

---

### Decision 2: Channel Priority

| Priority | Channel | Status | Notes |
|----------|---------|--------|-------|
| 1️⃣ | **WhatsApp** | 🔴 Broken in prod | Replace current hardcoded Twilio webhook |
| 2️⃣ | **Email** | ⚪ Not built | Gmail/SendGrid inbound → translate → reply |
| 3️⃣ | **Slack** | ⚪ Not built | Slash command `/translate [lang] [text]` |
| 4️⃣ | **Batch (MongoDB)** | ⚪ Not built | Scheduled overnight job for queued jobs |

---

### Decision 3: API Key Authentication Strategy

Three options for securing the n8n → AI Polyglots backend connection:

| Option | How It Works | Security | Cost | Complexity | Best For |
|--------|-------------|----------|------|-----------|---------|
| **A: Env Var Secret** (Recommended) | `N8N_WEBHOOK_SECRET` stored in Render env vars. n8n sends it as `X-N8N-API-Key` header. Backend checks it. | Medium | $0 | Low | MVP, internal tools |
| **B: Existing `/api/keys/generate`** | Generate a user-style API key in MongoDB, pass it from n8n. | Medium | $0 | Low | Works, but mixes internal + user-facing auth |
| **C: JWT Token** | n8n generates a signed JWT; backend validates signature. | High | $0 | High | Enterprise / public-facing APIs |

> **Recommendation: Option A** for MVP.  
> - Fastest to implement (one env var, one header check)  
> - Zero DB dependency (works even if MongoDB is down)  
> - Isolated from user-facing API keys  
> - Easy to rotate: just change the env var in Render dashboard  
> 
> Option B is tempting but couples your internal auth to your user management system — if a user's key gets compromised it could affect internal workflows too.  
> Option C is overkill for a private n8n→backend channel.

**Selected:** Option A — `N8N_WEBHOOK_SECRET` environment variable.

---

## 🔧 Phase 1: Backend Changes (AI Polyglots `server.py`)

### 1.0 Branch Setup
- [x] Create `feature/n8n-integration` branch from `main`
- [x] Branch tracking on remote (`git push -u origin feature/n8n-integration`)

### 1.1 Generic n8n Webhook Endpoint
- [ ] Add `POST /api/webhooks/n8n` to `server.py`
  - Accept JSON with `action` field: `"translate"`, `"voice-translate"`, `"sign-to-text"`
  - Route to correct handler based on `action`
  - Return JSON result to n8n

### 1.2 API Key Security (Option A)
- [ ] Add `X-N8N-API-Key` header check to the new endpoint
- [ ] Read `N8N_WEBHOOK_SECRET` from environment variable
- [ ] Return `403 Forbidden` if header missing or doesn't match
- [ ] Add `N8N_WEBHOOK_SECRET` to Render dashboard environment variables

### 1.3 CORS Update
- [ ] Add n8n cloud domain to CORS allowed origins
  - `https://[your-name].app.n8n.cloud`
  - Update after account is created with actual URL

### 1.4 Backend Tests
- [ ] Add `test_n8n_webhook_translate()` to `tests/test_api.py`
- [ ] Add `test_n8n_webhook_invalid_key()` (must return 403)
- [ ] Confirm all tests pass: `pytest tests/test_api.py -v`

---

## 🔀 Phase 2: n8n Workflow Builds

> ⚠️ Requires n8n account. Sign up at https://n8n.io before starting this phase.

### 2.0 Account Setup
- [!] Sign up at https://n8n.io (free cloud tier)
- [!] Note webhook base URL (e.g. `https://[name].app.n8n.cloud/webhook/...`)
- [!] Add `N8N_WEBHOOK_SECRET` value to both n8n (as a credential) and Render (as env var)

### 2.1 WhatsApp Translation (Priority 1 — Replace Broken Webhook)
- [ ] Create workflow: **"WhatsApp Inbound Translation"**
- [ ] Add **Webhook** trigger node → copy the URL
- [ ] Add **HTTP Request** node:
  - `POST https://aipolyglots-api.onrender.com/api/webhooks/n8n`
  - Body: `{ "action": "translate", "text": "{{$json.Body}}", "from": "{{$json.From}}", "target_language": "en" }`
  - Header: `X-N8N-API-Key: {{ $env.N8N_WEBHOOK_SECRET }}`
- [ ] Add **Twilio** node → send `translated_text` back as WhatsApp reply
- [ ] Activate workflow
- [ ] Update Twilio console: change WhatsApp webhook URL to the n8n webhook URL

### 2.2 Email Translation (Priority 2)
- [ ] Create workflow: **"Email Inbound Translation"**
- [ ] Trigger: Gmail webhook (new email label or inbox)
- [ ] Extract email body → `POST /api/webhooks/n8n` with `action: translate`
- [ ] Reply to sender with translated output via Gmail node
- [ ] Activate workflow

### 2.3 Slack Translation Bot (Priority 3)
- [ ] Create workflow: **"Slack /translate Command"**
- [ ] Trigger: Slack slash command webhook
- [ ] Parse `text` field (format: `/translate [lang] [text]`)
- [ ] Call `/api/webhooks/n8n`
- [ ] Post translation result back to Slack channel
- [ ] Activate workflow

### 2.4 Scheduled Batch Translations (Priority 4)
- [ ] Create workflow: **"Nightly Batch Translations"**
- [ ] Trigger: Cron — daily at 6am UTC
- [ ] Read pending jobs from MongoDB (via HTTP to a new `/api/queue` endpoint)
- [ ] Loop: call `/api/webhooks/n8n` for each job
- [ ] Update MongoDB record status to `"completed"`
- [ ] Activate workflow

### 2.5 API Health Monitor (Bonus)
- [ ] Create workflow: **"AI Polyglots Health Monitor"**
- [ ] Trigger: Cron every 5 minutes
- [ ] `GET https://aipolyglots-api.onrender.com/api/`
- [ ] If response != 200 → send alert (Slack or email)
- [ ] Activate workflow

---

## ✅ Phase 3: End-to-End Testing

### 3.1 WhatsApp Flow
- [ ] Send test WhatsApp message to Twilio number
- [ ] Confirm message arrives at n8n (check n8n Executions log)
- [ ] Confirm `/api/webhooks/n8n` called (check Render logs)
- [ ] Confirm translated reply arrives on WhatsApp

### 3.2 Email Flow
- [ ] Send test email to configured inbox
- [ ] Confirm translated reply received

### 3.3 Slack Flow
- [ ] Run `/translate es Hello world` in Slack
- [ ] Confirm `Hola mundo` reply posted to channel

### 3.4 Security Test
- [ ] Call `/api/webhooks/n8n` with wrong API key → must return `403`
- [ ] Call with no header → must return `403`

### 3.5 Regression Tests
- [ ] `pytest tests/ -v` — all green including new n8n tests

---

## 🚀 Phase 4: Merge to Production

### Pre-Merge Checklist
- [ ] All Phase 1–3 tasks marked `[x]`
- [ ] `pytest tests/ -v` all green
- [ ] `N8N_WEBHOOK_SECRET` set in Render dashboard
- [ ] Twilio webhook URL updated to n8n URL
- [ ] CORS updated with actual n8n cloud URL

### Merge Commands
```bash
git checkout main
git merge feature/n8n-integration
git push origin main
```

- [ ] Merge PR: `feature/n8n-integration` → `main` on GitHub
- [ ] Confirm Render auto-deploys
- [ ] Confirm Vercel frontend loads (no regressions)
- [ ] Send final WhatsApp test message on production

---

## 📝 Decisions Log

| Date | Decision | Outcome |
|------|----------|---------|
| 2026-05-13 | **Hosting:** n8n Cloud Free Tier for MVP | ✅ 5 workflow max; covers all 4 planned channels. Self-host on Render when >4 needed. |
| 2026-05-13 | **Render status:** Stays as-is | ✅ n8n is an *additional* service, not a replacement. FastAPI backend unchanged. |
| 2026-05-13 | **Channel priority:** WhatsApp → Email → Slack → Batch | ✅ WhatsApp is broken in prod — highest urgency |
| 2026-05-13 | **Auth:** Option A — `N8N_WEBHOOK_SECRET` env var | ✅ Fastest, safest, zero DB dependency. Do NOT use `/api/keys/generate`. |

---

## 🔗 References
- [n8n cloud signup](https://n8n.io)
- [Existing n8n architecture notes](./n8n_architecture.md)
- [AI Polyglots backend](../backend/server.py)
- [Test suite](../tests/test_api.py)
- [Render dashboard](https://dashboard.render.com)
- [Twilio console](https://console.twilio.com)
