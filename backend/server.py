from fastapi import FastAPI, APIRouter, HTTPException, Request, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import HTMLResponse, JSONResponse
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import secrets
import hashlib
from datetime import datetime, timezone
import base64
import io
import time
from collections import defaultdict

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ==================== RATE LIMITER ====================

class RateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)

    def is_allowed(self, key: str, max_per_minute: int = 30) -> bool:
        now = time.time()
        window = [t for t in self.requests[key] if now - t < 60]
        self.requests[key] = window
        if len(window) >= max_per_minute:
            return False
        self.requests[key].append(now)
        return True

    def get_usage(self, key: str) -> int:
        now = time.time()
        return len([t for t in self.requests[key] if now - t < 60])

rate_limiter = RateLimiter()


# ==================== MODELS ====================

class TranslationRequest(BaseModel):
    text: str
    source_language: str
    target_language: str

class TranslationResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VoiceTranslationRequest(BaseModel):
    audio_base64: str
    source_language: str
    target_language: str

class VoiceTranslationResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transcribed_text: str
    translated_text: str
    audio_base64: Optional[str] = None
    source_language: str
    target_language: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SignLanguageRequest(BaseModel):
    image_base64: str
    target_language: str = "en"

class SignLanguageResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    interpreted_text: str
    target_language: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TextToSignRequest(BaseModel):
    text: str
    sign_language: str = "ASL"

class TextToSignResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    sign_description: str
    sign_language: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ApiKeyCreate(BaseModel):
    name: str
    scope: str = "translate"  # translate, full, read-only
    rate_limit: int = 30  # requests per minute
    daily_cap: int = 1000  # max requests per day, 0 = unlimited

class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key: str
    scope: str
    rate_limit: int
    daily_cap: int
    created_at: str

class WidgetTranslateRequest(BaseModel):
    text: str
    source_language: str = "auto"
    target_language: str = "en"


# ==================== HELPERS ====================

def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()

def mask_key(key: str) -> str:
    if len(key) <= 10:
        return "***"
    return key[:5] + "\u2022" * 12 + key[-4:]


async def translate_with_openai(text: str, source_lang: str, target_lang: str) -> str:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"translate_{uuid.uuid4()}",
        system_message=f"You are a professional translator. Translate the given text from {source_lang} to {target_lang}. Only provide the translation, no explanations."
    ).with_model("openai", "gpt-4o-mini")
    return await chat.send_message(UserMessage(text=text))


async def transcribe_audio_openai(audio_base64: str, language: str) -> str:
    from openai import AsyncOpenAI
    openai_client = AsyncOpenAI(api_key=EMERGENT_LLM_KEY, base_url="https://emergentintegrations-production.up.railway.app/api/v1")
    audio_bytes = base64.b64decode(audio_base64)
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = "audio.webm"
    transcription = await openai_client.audio.transcriptions.create(
        model="whisper-1", file=audio_file,
        language=language if language != "auto" else None
    )
    return transcription.text


async def text_to_speech_openai(text: str) -> str:
    from openai import AsyncOpenAI
    openai_client = AsyncOpenAI(api_key=EMERGENT_LLM_KEY, base_url="https://emergentintegrations-production.up.railway.app/api/v1")
    response = await openai_client.audio.speech.create(model="tts-1", voice="nova", input=text)
    return base64.b64encode(response.content).decode('utf-8')


async def interpret_sign_language(image_base64: str, target_lang: str) -> str:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"sign_{uuid.uuid4()}",
        system_message=f"You are an expert in sign language interpretation. Analyze the image and describe what sign language gestures you see, then provide the meaning in {target_lang}. Be specific and accurate."
    ).with_model("openai", "gpt-4o")
    return await chat.send_message(UserMessage(
        text="What sign language gesture is being shown in this image? Provide the interpretation.",
        image_urls=[f"data:image/jpeg;base64,{image_base64}"]
    ))


async def generate_sign_description(text: str, sign_language: str) -> str:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"sign_desc_{uuid.uuid4()}",
        system_message=f"You are an expert in {sign_language} (Sign Language). Describe step-by-step how to sign the given text in {sign_language}, including hand shapes, movements, and facial expressions."
    ).with_model("openai", "gpt-4o-mini")
    return await chat.send_message(UserMessage(text=f"How do I sign: '{text}'"))


async def validate_api_key(api_key: str, required_scope: str = "translate") -> dict:
    """Validate API key and check rate limits, scopes, and daily caps."""
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing API key. Include X-Api-Key header.")

    key_hash = hash_key(api_key)
    key_doc = await db.api_keys.find_one({"key_hash": key_hash, "active": True}, {"_id": 0})

    if not key_doc:
        raise HTTPException(status_code=401, detail="Invalid API key.")

    # Check scope
    scope = key_doc.get("scope", "translate")
    scope_hierarchy = {"read-only": 0, "translate": 1, "full": 2}
    required_level = scope_hierarchy.get(required_scope, 1)
    key_level = scope_hierarchy.get(scope, 1)
    if key_level < required_level:
        raise HTTPException(status_code=403, detail=f"Key scope '{scope}' insufficient. Requires '{required_scope}'.")

    # Check rate limit
    rate_limit = key_doc.get("rate_limit", 30)
    if not rate_limiter.is_allowed(key_hash, rate_limit):
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded ({rate_limit} requests/minute). Try again shortly.",
            headers={"Retry-After": "60"}
        )

    # Check daily cap
    daily_cap = key_doc.get("daily_cap", 1000)
    if daily_cap > 0:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        daily_usage = key_doc.get("daily_usage", {})
        today_count = daily_usage.get(today, 0)
        if today_count >= daily_cap:
            raise HTTPException(status_code=429, detail=f"Daily usage cap reached ({daily_cap} requests/day). Resets at midnight UTC.")

        await db.api_keys.update_one(
            {"key_hash": key_hash},
            {"$inc": {f"daily_usage.{today}": 1, "usage_count": 1},
             "$set": {"last_used": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await db.api_keys.update_one(
            {"key_hash": key_hash},
            {"$inc": {"usage_count": 1},
             "$set": {"last_used": datetime.now(timezone.utc).isoformat()}}
        )

    return key_doc


# ==================== CORE TRANSLATION ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "AIpolyglots Translation API", "status": "active", "version": "2.1"}


@api_router.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    translated = await translate_with_openai(request.text, request.source_language, request.target_language)
    response = TranslationResponse(
        original_text=request.text, translated_text=translated,
        source_language=request.source_language, target_language=request.target_language
    )
    await db.translations.insert_one(response.model_dump())
    return response


@api_router.post("/voice-translate", response_model=VoiceTranslationResponse)
async def voice_translate(request: VoiceTranslationRequest):
    transcribed = await transcribe_audio_openai(request.audio_base64, request.source_language)
    translated = await translate_with_openai(transcribed, request.source_language, request.target_language)
    audio_base64 = await text_to_speech_openai(translated)
    response = VoiceTranslationResponse(
        transcribed_text=transcribed, translated_text=translated, audio_base64=audio_base64,
        source_language=request.source_language, target_language=request.target_language
    )
    save_doc = response.model_dump()
    save_doc.pop('audio_base64', None)
    await db.voice_translations.insert_one(save_doc)
    return response


@api_router.post("/sign-to-text", response_model=SignLanguageResponse)
async def sign_to_text(request: SignLanguageRequest):
    interpreted = await interpret_sign_language(request.image_base64, request.target_language)
    response = SignLanguageResponse(interpreted_text=interpreted, target_language=request.target_language)
    await db.sign_interpretations.insert_one(response.model_dump())
    return response


@api_router.post("/text-to-sign", response_model=TextToSignResponse)
async def text_to_sign(request: TextToSignRequest):
    description = await generate_sign_description(request.text, request.sign_language)
    response = TextToSignResponse(text=request.text, sign_description=description, sign_language=request.sign_language)
    await db.text_to_sign.insert_one(response.model_dump())
    return response


@api_router.get("/history")
async def get_history(limit: int = 50):
    translations = await db.translations.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return {"history": translations, "count": len(translations)}


@api_router.get("/supported-languages")
async def get_supported_languages():
    languages = {
        "af": "Afrikaans", "sq": "Albanian", "am": "Amharic", "ar": "Arabic",
        "hy": "Armenian", "az": "Azerbaijani", "eu": "Basque", "be": "Belarusian",
        "bn": "Bengali", "bs": "Bosnian", "bg": "Bulgarian", "ca": "Catalan",
        "ceb": "Cebuano", "zh": "Chinese", "co": "Corsican", "hr": "Croatian",
        "cs": "Czech", "da": "Danish", "nl": "Dutch", "en": "English",
        "eo": "Esperanto", "et": "Estonian", "fi": "Finnish", "fr": "French",
        "fy": "Frisian", "gl": "Galician", "ka": "Georgian", "de": "German",
        "el": "Greek", "gu": "Gujarati", "ht": "Haitian Creole", "ha": "Hausa",
        "haw": "Hawaiian", "he": "Hebrew", "hi": "Hindi", "hmn": "Hmong",
        "hu": "Hungarian", "is": "Icelandic", "ig": "Igbo", "id": "Indonesian",
        "ga": "Irish", "it": "Italian", "ja": "Japanese", "jv": "Javanese",
        "kn": "Kannada", "kk": "Kazakh", "km": "Khmer", "rw": "Kinyarwanda",
        "ko": "Korean", "ku": "Kurdish", "ky": "Kyrgyz", "lo": "Lao",
        "la": "Latin", "lv": "Latvian", "lt": "Lithuanian", "lb": "Luxembourgish",
        "mk": "Macedonian", "mg": "Malagasy", "ms": "Malay", "ml": "Malayalam",
        "mt": "Maltese", "mi": "Maori", "mr": "Marathi", "mn": "Mongolian",
        "my": "Myanmar", "ne": "Nepali", "no": "Norwegian", "ny": "Nyanja",
        "or": "Odia", "ps": "Pashto", "fa": "Persian", "pl": "Polish",
        "pt": "Portuguese", "pa": "Punjabi", "ro": "Romanian", "ru": "Russian",
        "sm": "Samoan", "gd": "Scots Gaelic", "sr": "Serbian", "st": "Sesotho",
        "sn": "Shona", "sd": "Sindhi", "si": "Sinhala", "sk": "Slovak",
        "sl": "Slovenian", "so": "Somali", "es": "Spanish", "su": "Sundanese",
        "sw": "Swahili", "sv": "Swedish", "tl": "Tagalog", "tg": "Tajik",
        "ta": "Tamil", "tt": "Tatar", "te": "Telugu", "th": "Thai",
        "tr": "Turkish", "tk": "Turkmen", "uk": "Ukrainian", "ur": "Urdu",
        "ug": "Uyghur", "uz": "Uzbek", "vi": "Vietnamese", "cy": "Welsh",
        "xh": "Xhosa", "yi": "Yiddish", "yo": "Yoruba", "zu": "Zulu"
    }
    sign_languages = {
        "ASL": "American Sign Language", "BSL": "British Sign Language",
        "ISL": "Indian Sign Language", "JSL": "Japanese Sign Language",
        "LSF": "French Sign Language", "Auslan": "Australian Sign Language",
        "DGS": "German Sign Language", "CSL": "Chinese Sign Language"
    }
    return {"spoken_languages": languages, "sign_languages": sign_languages}


# ==================== SECURE API KEY MANAGEMENT ====================

@api_router.post("/keys/generate", response_model=ApiKeyResponse)
async def generate_api_key(request: ApiKeyCreate):
    """Generate a new API key. The full key is returned ONLY ONCE — save it immediately."""
    raw_key = f"pk_{secrets.token_hex(24)}"
    key_hash_val = hash_key(raw_key)

    doc = {
        "id": str(uuid.uuid4()),
        "name": request.name,
        "key_hash": key_hash_val,
        "key_prefix": raw_key[:8],
        "key_suffix": raw_key[-4:],
        "scope": request.scope,
        "rate_limit": request.rate_limit,
        "daily_cap": request.daily_cap,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "usage_count": 0,
        "daily_usage": {},
        "last_used": None,
        "active": True
    }
    await db.api_keys.insert_one(doc)

    return ApiKeyResponse(
        id=doc["id"], name=doc["name"], key=raw_key,
        scope=doc["scope"], rate_limit=doc["rate_limit"],
        daily_cap=doc["daily_cap"], created_at=doc["created_at"]
    )


@api_router.get("/keys")
async def list_api_keys():
    """List API keys with masked values. Full keys are never returned after creation."""
    keys = await db.api_keys.find({"active": True}, {"_id": 0, "key_hash": 0, "daily_usage": 0}).to_list(100)
    for k in keys:
        prefix = k.pop("key_prefix", "pk_??")
        suffix = k.pop("key_suffix", "????")
        k["key_masked"] = f"{prefix}{'*' * 12}{suffix}"
    return {"keys": keys}


@api_router.delete("/keys/{key_id}")
async def revoke_api_key(key_id: str):
    """Revoke (deactivate) an API key."""
    result = await db.api_keys.update_one(
        {"id": key_id},
        {"$set": {"active": False, "revoked_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"status": "revoked", "key_id": key_id}


# ==================== PUBLIC API (key-authenticated + rate-limited) ====================

@api_router.post("/v1/translate")
async def public_translate(request: WidgetTranslateRequest, x_api_key: str = Header(None)):
    """Public translation endpoint with key auth, rate limiting, and usage tracking."""
    await validate_api_key(x_api_key, required_scope="translate")
    source = request.source_language if request.source_language != "auto" else "auto-detect"
    translated = await translate_with_openai(request.text, source, request.target_language)
    return {"translated_text": translated, "source_language": request.source_language, "target_language": request.target_language}


@api_router.post("/widget/translate")
async def widget_translate(request: WidgetTranslateRequest, x_api_key: str = Header(None)):
    await validate_api_key(x_api_key, required_scope="translate")
    source = request.source_language if request.source_language != "auto" else "auto-detect"
    translated = await translate_with_openai(request.text, source, request.target_language)
    return {"translated_text": translated}


# ==================== WEBHOOKS ====================

@api_router.post("/webhooks/whatsapp")
async def whatsapp_webhook(request: Request):
    try:
        form = await request.form()
        body = form.get("Body", "")
        from_number = form.get("From", "")
        to_language = "en"

        if body.startswith("/to "):
            parts = body.split(" ", 2)
            if len(parts) >= 3:
                to_language = parts[1]
                body = parts[2]

        if not body:
            return HTMLResponse(content='<Response><Message>Send me any text and I\'ll translate it! Use "/to es Hello" to translate to Spanish.</Message></Response>', media_type="application/xml")

        translated = await translate_with_openai(body, "auto-detect", to_language)
        twiml = f'<Response><Message>{translated}</Message></Response>'
        return HTMLResponse(content=twiml, media_type="application/xml")
    except Exception as e:
        logger.error(f"WhatsApp webhook error: {e}")
        return HTMLResponse(content='<Response><Message>Translation error. Please try again.</Message></Response>', media_type="application/xml")


@api_router.get("/webhooks/whatsapp")
async def whatsapp_webhook_verify():
    return {"status": "WhatsApp webhook active"}


@api_router.post("/webhooks/voice")
async def voice_call_webhook(request: Request):
    try:
        form = await request.form()
        speech_result = form.get("SpeechResult", "")

        if not speech_result:
            twiml = '''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Welcome to AIpolyglots. Speak in any language and I will translate to English.</Say>
    <Gather input="speech" action="/api/webhooks/voice" method="POST" speechTimeout="auto" language="en-US">
        <Say voice="alice">Please speak now.</Say>
    </Gather>
</Response>'''
            return HTMLResponse(content=twiml, media_type="application/xml")

        translated = await translate_with_openai(speech_result, "auto-detect", "en")
        twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">{translated}</Say>
    <Gather input="speech" action="/api/webhooks/voice" method="POST" speechTimeout="auto">
        <Say voice="alice">Speak again to continue.</Say>
    </Gather>
</Response>'''
        return HTMLResponse(content=twiml, media_type="application/xml")
    except Exception as e:
        logger.error(f"Voice webhook error: {e}")
        return HTMLResponse(content='<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error. Please try again.</Say></Response>', media_type="application/xml")


# ==================== API DOCS ====================

@api_router.get("/docs/endpoints")
async def api_docs():
    return {
        "name": "AIpolyglots Translation API",
        "version": "2.1",
        "base_url": "/api",
        "authentication": "Include header: X-Api-Key: your_api_key",
        "security": {
            "key_hashing": "Keys are SHA-256 hashed at rest. Full key shown only once on creation.",
            "rate_limiting": "Configurable per key (default: 30 req/min)",
            "daily_caps": "Configurable per key (default: 1000 req/day)",
            "scopes": ["read-only", "translate", "full"],
            "https": "All endpoints require HTTPS in production",
            "data_retention": "Translation text is NOT logged by default for API calls. Only metadata (timestamps, language pairs) is stored."
        },
        "endpoints": [
            {"method": "POST", "path": "/v1/translate", "description": "Translate text", "auth": True, "scope": "translate"},
            {"method": "POST", "path": "/keys/generate", "description": "Generate API key", "auth": False,
             "body": {"name": "string", "scope": "translate|full|read-only", "rate_limit": "int (req/min)", "daily_cap": "int (req/day)"}},
            {"method": "GET", "path": "/keys", "description": "List keys (masked)", "auth": False},
            {"method": "DELETE", "path": "/keys/{key_id}", "description": "Revoke a key", "auth": False},
            {"method": "GET", "path": "/supported-languages", "description": "List languages", "auth": False},
            {"method": "POST", "path": "/webhooks/whatsapp", "description": "WhatsApp webhook", "auth": False},
            {"method": "POST", "path": "/webhooks/voice", "description": "Voice call webhook", "auth": False},
        ]
    }


# ==================== APP SETUP ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db():
    await db.translations.create_index([("timestamp", -1)])
    await db.api_keys.create_index([("key_hash", 1)], unique=True)
    await db.api_keys.create_index([("id", 1)])
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
