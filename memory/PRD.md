# AIpolyglots - Universal Translation Platform PRD

## Original Problem Statement
User wanted to recover their Polyglot AI project from a previous Emergent session. Source code was found on GitHub: https://github.com/marapt/Emergent-Universal-Translation-APP. Originally built with Expo/React Native, rebuilt as a React web app. Then enhanced with integration capabilities (API, WhatsApp, Phone, Chrome Extension, Widget) and a product capabilities landing page.

## Architecture
- **Backend**: FastAPI + MongoDB + OpenAI (via emergentintegrations library)
- **Frontend**: React 19 + Tailwind CSS + Phosphor Icons
- **Database**: MongoDB (translations, voice_translations, sign_interpretations, text_to_sign, api_keys, whatsapp_translations, call_translations)
- **AI Integration**: OpenAI GPT-4o-mini (text), GPT-4o (vision), Whisper (STT), TTS-1 (TTS)
- **Key**: Emergent LLM Universal Key

## User Personas
- Language learners needing quick translations
- Travelers needing voice/phone translation
- Deaf/hard-of-hearing users needing sign language tools
- Developers integrating translation into their apps
- Businesses wanting WhatsApp/website translation

## Core Requirements
1. Text Translation (100+ languages)
2. Voice Translation (record, transcribe, translate, TTS playback)
3. Sign Language to Text (upload image, AI interpretation)
4. Text to Sign Language (8 sign languages, step-by-step)
5. Translation History (persisted in MongoDB)
6. Public REST API with key authentication
7. WhatsApp bot integration (Twilio webhook)
8. Phone call translation (Twilio Voice webhook)
9. Embeddable JS widget for websites
10. Chrome extension for webpage translation

## What's Been Implemented

### Iteration 1 (April 16, 2026) - Core App
- Full backend with 7 API endpoints
- React web frontend rebuilt from Expo/React Native

### Iteration 2 (April 16, 2026) - UI Redesign
- Modern sleek design matching original mobile app screenshots
- Plus Jakarta Sans font, rounded corners, soft shadows, bottom tab nav

### Iteration 3 (April 16, 2026) - Integrations & Landing Page
- Product capabilities landing page with bento-grid showcase (Translator, Voice, Messages, Documents, API)
- Stats bar (100+ languages, 8 sign languages, 5+ integrations, <2s latency)
- Public REST API with API key generation and authentication (POST /api/v1/translate)
- API key management (generate, list, mask)
- Embeddable widget documentation and code
- Chrome extension code (manifest.json + content.js)
- WhatsApp webhook endpoint (/api/webhooks/whatsapp) - ready for Twilio

### Iteration 4 (April 16, 2026) - Widget, Chrome Extension, Deployment
- Hosted widget.js file served at /widget.js (floating translation panel for any website)
- Chrome extension with manifest v3 (content.js, popup.html, background.js, icons)
- Downloadable extension .zip at /polyglot-chrome-extension.zip
- Updated Integrations page with download button and embed code
- Fixed .gitignore blocking .env files (deployment blocker)
- Deployment health check: ALL CHECKS PASSED - READY FOR DEPLOYMENT
- 21/21 backend tests passing, all frontend UI tests passing
- Phone call webhook endpoint (/api/webhooks/voice) - ready for Twilio
- API documentation endpoint (/api/docs/endpoints)
- Integrations page with 5 sub-sections (REST API, Widget, Chrome Extension, WhatsApp, Phone Calls)
- All 18 backend tests passing, all frontend UI tests passing

## Prioritized Backlog
### P0 (Done)
- [x] Text, Voice, Sign Language translation
- [x] Translation history
- [x] Landing page with capabilities showcase
- [x] Public API with key auth
- [x] WhatsApp & Phone webhooks
- [x] Widget & Chrome extension documentation

### Iteration 5 (April 16, 2026) - Security Hardening
- API keys SHA-256 hashed at rest (raw keys never stored in database)
- Full key shown only once at creation, masked everywhere else
- Per-key rate limiting (configurable requests/minute, default: 30)
- Daily usage caps (configurable requests/day, default: 1,000)
- Scoped permissions: read-only, translate, full
- Key revocation via DELETE /api/keys/{id}
- Security & Privacy documentation tab
- Code examples use environment variables with security warnings
- Fixed bug: revoked keys were still authenticating (added active:true filter)
- 20/20 backend tests passing, all frontend UI tests passing
- [ ] Connect Twilio for live WhatsApp/Phone testing
- [ ] Build actual Chrome extension package (downloadable .zip)
- [ ] Build working widget.js hosted endpoint
- [ ] Add copy-to-clipboard for translations
- [ ] Dark mode toggle

### P2 (Future)
- [ ] Real-time conversation mode (two-way live translation)
- [ ] Google Cloud / Azure translation fallbacks
- [ ] Offline translation mode
- [ ] Sign language video demonstrations
- [ ] Usage analytics dashboard for API keys
- [ ] Rate limiting for public API
