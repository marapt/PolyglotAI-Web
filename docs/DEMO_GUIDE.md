# 🎬 AI Polyglots Demo Guide

This guide explains how to activate **"Premium Mode"** (OpenAI-powered translations) for high-stakes demos or presentations, while keeping the project 100% free for daily use.

---

## 🛡️ The Zero-Cost Safety Switch

By default, the backend is locked in **"Standard Mode"** (using MyMemory and LibreTranslate). This ensures you never incur unexpected API costs.

To activate **"Premium Mode"**, you must explicitly toggle the safety switch in your Render dashboard.

### How to Activate Premium Mode
1.  Log in to your **Render Dashboard**.
2.  Select your **aipolyglots-backend** service.
3.  Go to the **Environment** tab.
4.  Add a new environment variable:
    *   **Key:** `DISABLE_PAID_ENGINES`
    *   **Value:** `false`
5.  Click **Save Changes**. Render will automatically redeploy with the new setting.

> [!NOTE]
> Ensure you also have `OPENAI_API_KEY` set in the same environment tab. If this key is missing or invalid, the system will automatically fall back to the free engines anyway.

---

## 🧪 Testing the Upgrade

Once `DISABLE_PAID_ENGINES=false` is live, you can verify the difference in WhatsApp or on the website:

1.  **WhatsApp Test:** Send a complex sentence like: *"The architectural nuances of the cathedral are highlighted by the gothic archways."* 
    *   **Standard Mode:** Might return a clunky or slightly mistranslated version.
    *   **Premium Mode:** Will return a professional-grade, contextually accurate translation.

2.  **Language Coverage:** OpenAI supports far more languages and better handling of slang/idioms than the free tier.

---

## 📈 Monitoring Costs

You can monitor your spending in the [OpenAI Usage Dashboard](https://platform.openai.com/usage). 

*   **Model Used:** `gpt-4o-mini` (The most cost-effective model).
*   **Approximate Cost:** $0.15 per 1 million tokens. Even a long presentation with 100 messages will likely cost less than **$0.01**.

---

## 🛠️ Other Demo Mode Tips

### 1. Pre-set your default language
If you are demoing to a Spanish-speaking audience, text the bot **"set language to Spanish"** before the presentation. This ensures that every random message you send during the demo is instantly translated to Spanish without you needing to type `/to es`.

### 2. Prevent "Cold Starts"
Render spins down free-tier servers after 15 minutes of inactivity. This causes a ~15 second delay on the first message. 
*   **Tip:** Send a "Hi" message to the bot 5 minutes before your presentation starts to ensure it is "awake."

### 3. Clear your history (Optional)
If you want a "clean slate" for a demo, you can manually delete the `user_preferences` and `n8n_events` collections in your MongoDB cluster via the MongoDB Atlas UI.
