# Polyglot AI - Universal Translation App PRD

## Original Problem Statement
User wanted to recover their Polyglot AI project from a previous Emergent session (https://where-my-code.preview.emergentagent.com/) which had expired. The project was originally built with Expo/React Native (mobile) frontend and FastAPI backend. Source code was found on GitHub: https://github.com/marapt/Emergent-Universal-Translation-APP

## Architecture
- **Backend**: FastAPI + MongoDB + OpenAI (via emergentintegrations library)
- **Frontend**: React 19 + Tailwind CSS + Phosphor Icons
- **Database**: MongoDB (translations, voice_translations, sign_interpretations, text_to_sign collections)
- **AI Integration**: OpenAI GPT-4o-mini (text translation, sign description), GPT-4o (vision/sign interpretation), Whisper (speech-to-text), TTS-1 (text-to-speech)
- **Key**: Emergent LLM Universal Key

## User Personas
- Language learners needing quick translations
- Travelers needing voice translation
- Deaf/hard-of-hearing users needing sign language tools
- Educators teaching sign language

## Core Requirements
1. Text Translation (100+ languages)
2. Voice Translation (record → transcribe → translate → TTS playback)
3. Sign Language to Text (upload image → AI interpretation)
4. Text to Sign Language (text → step-by-step signing instructions, 8 sign languages)
5. Translation History (persisted in MongoDB)

## What's Been Implemented (April 16, 2026)
- Full backend with 7 API endpoints (/api/, /api/translate, /api/voice-translate, /api/sign-to-text, /api/text-to-sign, /api/history, /api/supported-languages)
- Full React web frontend rebuilt from original Expo/React Native codebase
- **UI Redesign (Iteration 2)**: Modern, sleek design matching original mobile app screenshots
  - Plus Jakarta Sans font, JetBrains Mono for code
  - Indigo accent (#4F46E5), soft shadows, rounded-2xl corners
  - Bottom tab navigation (mobile-style)
  - Card-based layout with soft borders and hover effects
  - Large circular mic button for voice recording
  - "Take Photo" / "Choose from Gallery" buttons for sign language
  - Info banners with light indigo background
- Web MediaRecorder API for voice recording (replacing Expo Audio)
- File upload/drag-drop for sign language images (replacing Expo Camera)
- All features tested and passing (12/12 backend tests, all UI tests) across 2 iterations

## Prioritized Backlog
### P0 (Done)
- [x] Text translation with language picker and swap
- [x] Voice translation with recording and playback
- [x] Sign language to text with image upload
- [x] Text to sign language converter
- [x] Translation history

### P1 (Next)
- [ ] Settings page (API key management for premium features)
- [ ] Copy to clipboard buttons for translations
- [ ] Bookmark/favorite translations

### P2 (Future)
- [ ] Google Cloud Translation API integration
- [ ] Azure Translator integration
- [ ] Real-time conversation mode
- [ ] Offline translation mode
- [ ] Sign language video demonstrations
- [ ] Voice accent selection
- [ ] Multi-service comparison
