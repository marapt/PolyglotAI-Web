# ⚙️ System Configuration Guide: Demo vs. Production

This document outlines the architectural differences between the current **"Demo/MVP"** state and the requirements for a **"Real-World/Scale"** deployment.

---

## 🛠️ Feature Comparison

| Feature | **Demo / MVP (Current)** | **Real-World / Production** |
| :--- | :--- | :--- |
| **WhatsApp Number** | Twilio Sandbox (+1 415 523 8886) | Verified WhatsApp Business API Number |
| **Onboarding** | User must text `join [code]` first | One-click: Just text the number |
| **Translation Engine** | Free Tier (MyMemory / LibreTranslate) | Premium Tier (OpenAI gpt-4o-mini) |
| **Cost** | **$0.00** (Zero Cost) | Pay-per-use (approx. $0.15 / 1M tokens) |
| **Safety Toggle** | `DISABLE_PAID_ENGINES=true` | `DISABLE_PAID_ENGINES=false` |
| **Database** | Shared MongoDB Atlas Cluster | Isolated Production DB instance |
| **Auth** | n8n Webhook Secret Header | Multi-layered OAuth + API Key encryption |

---

## 🔑 Environment Variables Reference

These variables are managed in the **Render (Backend)** and **Vercel (Frontend)** dashboards.

| Variable | Description | Demo Setting | Production Setting |
| :--- | :--- | :--- | :--- |
| `MONGO_URL` | Connection string for MongoDB | Atlas Free Tier | Dedicated Cluster |
| `OPENAI_API_KEY` | Required for High-Quality translations | Your Personal Key | Project/Org Key |
| `DISABLE_PAID_ENGINES` | The "Safety Switch" | `true` | `false` |
| `N8N_WEBHOOK_SECRET` | Auth between n8n and Backend | Set to any secret | Rotate regularly |
| `TWILIO_ACCOUNT_SID` | For n8n outbound messages | Sandbox SID | Production SID |

---

## 🚀 Transitioning to "Real Users"

To move from the current demo state to support real, paying users, follow these steps:

### 1. Verification
You must verify your Meta Business Manager to move away from the Twilio Sandbox. This removes the "join" code requirement and gives you a professional vanity number.

### 2. Scalability
The current "Standard Mode" translation (MyMemory) has strict rate limits (approx 500-1000 characters per request). For real users, you **must** use the OpenAI integration (`DISABLE_PAID_ENGINES=false`) to ensure reliability.

### 3. Analytics
The current system logs events to the `n8n_events` collection. For production, you should connect a dashboard (like PostHog or Mixpanel) to track user retention and translation volume.

---

## 🛡️ Security Note
The `N8N_WEBHOOK_SECRET` is the primary line of defense protecting your backend from unauthorized translation requests. Ensure this header is configured identically in both **n8n** (HTTP Request Node) and **Render** (Environment Variables).
