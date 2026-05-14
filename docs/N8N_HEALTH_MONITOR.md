# 💓 n8n Health Monitor (Keep-Alive)

This monitor is **integrated** into the existing **'Aipolyglots Webhook to API'** workflow to save on your 5-workflow free tier limit.

> **Why:** Render spins down free-tier servers after 15 minutes of inactivity. When it wakes up, there is a ~15 second delay. This "Health Monitor" pings the server every 10 minutes to keep it warm and responsive for WhatsApp users.

---

## 🛠️ n8n Workflow Setup

### 1. The Trigger: "Schedule"
*   **Node:** `Schedule` (formerly Cron)
*   **Settings:** 
    *   **Trigger Interval:** Every 10 minutes (or 5 minutes for max responsiveness).

### 2. The Action: "HTTP Request"
*   **Node:** `HTTP Request`
*   **Method:** `GET`
*   **URL:** `https://aipolyglots-backend.onrender.com/api/health/keep-alive`
*   **Authentication:** None required for this specific endpoint.

### 3. (Optional) Error Alerting
If you want to know when your server is actually down:
*   Add an **Error Trigger** node to the workflow.
*   Connect it to a **Discord/Slack/Email** node to notify you if the ping fails.

---

## 📊 Benefits
*   **No Cold Starts:** The first message a WhatsApp user sends will be processed instantly.
*   **Health Tracking:** You can check the n8n execution history to see exactly when the server was responsive.
*   **Monitoring:** The response from `/api/health/keep-alive` includes a timestamp and the current engine mode (Standard vs. Premium).

---

## ✅ Status: FULLY CONFIGURED
- [x] Integrate Schedule node into existing WhatsApp workflow.
- [x] Configure HTTP Request to `/api/health/keep-alive`.
- [x] Save and Publish.
- [x] Verify execution in n8n logs.
