from fastapi import FastAPI, APIRouter, HTTPException, Request, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import HTMLResponse, JSONResponse
import httpx
import openai
from openai import AsyncOpenAI
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


# --- Logging Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Database Setup (Hardened) ---
try:
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'aipolyglots')
    
    if mongo_url:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        logger.info(f"Connected to MongoDB: {db_name}")
    else:
        logger.warning("MONGO_URL not found. Database features will be simulated.")
        db = None
except Exception as e:
    logger.error(f"Database connection error: {e}")
    db = None

# Translation powered by MyMemory (free, no API key required)
MYMEMORY_API = "https://api.mymemory.translated.net/get"

# OpenAI Configuration
openai_client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini") # Cost-effective and high quality
DISABLE_PAID_ENGINES = os.environ.get("DISABLE_PAID_ENGINES", "true").lower() == "true" # Default to ZERO COST



app = FastAPI()
api_router = APIRouter(prefix="/api")



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


LIBRETRANSLATE_API = "https://translate.argosopentech.com/translate"

# ==================== WHATSAPP MESSAGE PARSER ====================

GREETING_KEYWORDS = {
    "hi", "hello", "hey", "hola", "help", "start", "?", "info",
    "bonjour", "ciao", "salut", "hallo", "olá", "привет", "مرحبا",
}

WHATSAPP_WELCOME = """\
👋 *Welcome to AI Polyglots!*

I translate messages instantly between 50+ languages.

📌 *HOW TO USE:*
• Send any text → I translate it to English
• Pick a target language: `/to [code] [your text]`

🌍 *EXAMPLES:*
  _Bonjour tout le monde_
  → Hello everyone

  _/to es Good morning, my name is Mara_
  → Buenos días, me llamo Mara

  _/to ja Thank you for your patience_
  → ご辛抱いただきありがとうございます

📋 *COMMON CODES:*
es · fr · de · pt · ja · zh · ar · hi · ko · it · ru

Type */help* anytime to see this message again."""

# Map of common language names → ISO codes (for natural-language targeting)
LANG_NAME_MAP = {
    "spanish": "es", "español": "es", "espanol": "es",
    "french": "fr", "français": "fr", "francais": "fr",
    "german": "de", "deutsch": "de",
    "portuguese": "pt", "português": "pt",
    "japanese": "ja", "日本語": "ja",
    "chinese": "zh", "mandarin": "zh", "中文": "zh",
    "arabic": "ar", "عربي": "ar",
    "hindi": "hi", "हिन्दी": "hi",
    "korean": "ko", "한국어": "ko",
    "italian": "it", "italiano": "it",
    "russian": "ru", "русский": "ru",
    "english": "en",
import re as _re
from utils.locale_helper import get_default_language_for_number

def is_setting_preference(text: str) -> str | None:
    """Check if the user is trying to set a default language."""
    text = text.strip().lower()
    # Match patterns like: "set language to spanish", "set default to fr", "/set es"
    m = _re.match(r"^(?:set language to|set default to|/set)\s+(\w+)$", text)
    if m:
        lang_raw = m.group(1)
        return LANG_NAME_MAP.get(lang_raw, lang_raw)
    return None

def parse_whatsapp_message(raw: str, from_number: str = "", user_pref: str = None) -> tuple[str, str, str]:
    """
    Parse a raw WhatsApp message into (text, source_language, target_language).

    Supported patterns (all case-insensitive):
      /to es Hello world
      translate to Spanish: Hello world
      Hello world → Spanish
      Hello world [es]
      Hello world (no target) → translate to Smart Locale
    """
    text = raw.strip()
    src = "auto-detect"
    tgt = "en"  # Temporary init, overwritten later

    # --- Pattern 1: /to [lang_code_or_name] [text] ---
    m = _re.match(r"^/to\s+(\w+)\s+(.+)$", text, _re.IGNORECASE | _re.DOTALL)
    if m:
        lang_raw, body = m.group(1).lower(), m.group(2).strip()
        tgt = LANG_NAME_MAP.get(lang_raw, lang_raw)
        return body, src, tgt

    # --- Pattern 2: translate to [lang]: [text] ---
    m = _re.match(r"^translate\s+to\s+(\w+)\s*[:\-]\s*(.+)$", text, _re.IGNORECASE | _re.DOTALL)
    if m:
        lang_raw, body = m.group(1).lower(), m.group(2).strip()
        tgt = LANG_NAME_MAP.get(lang_raw, lang_raw)
        return body, src, tgt

    # --- Pattern 3: [text] → [lang] ---
    m = _re.match(r"^(.+?)\s*[→>]\s*(\w+)$", text, _re.DOTALL)
    if m:
        body, lang_raw = m.group(1).strip(), m.group(2).lower()
        tgt = LANG_NAME_MAP.get(lang_raw, lang_raw)
        return body, src, tgt

    # --- Pattern 4: [text] [es] (bracket notation) ---
    m = _re.match(r"^(.+?)\s+\[(\w{2,3})\]$", text, _re.DOTALL)
    if m:
        body, lang_raw = m.group(1).strip(), m.group(2).lower()
        tgt = LANG_NAME_MAP.get(lang_raw, lang_raw)
        return body, src, tgt

    # --- Default: no target specified → translate to User Pref or Smart Locale ---
    if user_pref:
        fallback_tgt = user_pref
    elif from_number:
        fallback_tgt = get_default_language_for_number(from_number)
    else:
        fallback_tgt = "en"
        
    return text, src, fallback_tgt


def is_greeting(text: str) -> bool:
    """Return True if the message is a greeting/help request rather than text to translate."""
    cleaned = text.strip().lower().rstrip("!.,?")
    return cleaned in GREETING_KEYWORDS or cleaned in {"/help", "/start", "/info"}



async def translate_with_openai(text: str, source_lang: str, target_lang: str) -> str:
    """Translate text using OpenAI's high-quality models."""
    if not openai_client.api_key:
        raise ValueError("OpenAI API key not configured")
        
    src = "auto-detect" if source_lang in ("auto", "auto-detect", "autodetect") else source_lang
    
    # Professional localization prompt
    system_prompt = (
        f"You are a professional translator. Translate the text from {src} to {target_lang}. "
        "Maintain the original tone, formatting, and intent. "
        "Only return the translated text. Do not provide explanations or alternatives."
    )
    
    try:
        response = await openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            temperature=0.1,
            max_tokens=2000
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"OpenAI translation failed: {e}")
        raise

async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Unified translation entry point with multi-tier fallbacks."""
    # Tier 1: OpenAI (Premium Quality, Low Cost) - ONLY used if explicitly enabled
    if not DISABLE_PAID_ENGINES and openai_client.api_key:
        try:
            return await translate_with_openai(text, source_lang, target_lang)
        except Exception:
            logger.warning("Tier 1 (OpenAI) failed, falling back to Tier 2 (MyMemory)")
            
    # Tier 2 & 3: MyMemory and LibreTranslate (Free Fallbacks)
    return await translate_with_mymemory(text, source_lang, target_lang)


async def translate_with_mymemory(text: str, source_lang: str, target_lang: str) -> str:
    """Translate text using MyMemory (primary) with LibreTranslate fallback. Both free, no key required."""
    src = "autodetect" if source_lang in ("auto", "auto-detect", "autodetect") else source_lang
    langpair = f"{src}|{target_lang}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        # --- Primary: MyMemory (email param = higher daily quota) ---
        try:
            r = await client.get(MYMEMORY_API, params={
                "q": text, "langpair": langpair, "de": "aipolyglots@demo.com"
            })
            if r.status_code == 200:
                data = r.json()
                translated = data.get("responseData", {}).get("translatedText", "")
                status = data.get("responseStatus")
                if translated and status in (200, "200"):
                    return translated
        except Exception as e:
            logger.warning(f"MyMemory failed: {e}, trying fallback...")

        # --- Fallback: LibreTranslate (multiple public instances) ---
        for lt_api in [
            "https://libretranslate.com/translate",
            "https://translate.argosopentech.com/translate",
            "https://translate.terraprint.co/translate",
        ]:
            try:
                src_lt = "auto" if src == "autodetect" else src
                r = await client.post(lt_api, json={
                    "q": text, "source": src_lt, "target": target_lang, "format": "text"
                })
                r.raise_for_status()
                translated = r.json().get("translatedText", "")
                if translated:
                    return translated
            except Exception as e:
                logger.warning(f"LibreTranslate instance {lt_api} failed: {e}")
                continue

    # Last resort: return original text with a note rather than crashing
    logger.error("All translation services failed — returning original text")
    return f"[Translation unavailable] {text}"


async def transcribe_audio_demo(audio_base64: str, language: str) -> str:
    """Demo stub for voice transcription (no live ASR in free tier)."""
    return "Hello, this is a voice translation demo."


async def text_to_speech_demo(text: str) -> Optional[str]:
    """TTS is not available in demo mode — frontend uses Web Speech API."""
    return None


async def interpret_sign_language_demo(image_base64: str, target_lang: str) -> str:
    """Demo stub for sign language interpretation."""
    return (
        "Sign language interpretation demo: The gesture appears to show an open hand "
        "with fingers extended, commonly associated with a greeting or 'hello' in ASL. "
        "For live interpretation, connect an OpenAI Vision-enabled key."
    )


async def generate_sign_description(text: str, sign_language: str) -> str:
    """Generate a step-by-step sign description using a structured template."""
    steps = [
        f"1. Begin with both hands relaxed at your sides.",
        f"2. For '{text}' in {sign_language}: form the dominant hand into the appropriate handshape.",
        f"3. Move the hand in the directional motion specific to this sign.",
        f"4. Pair with the correct facial expression to convey meaning.",
        f"5. Hold the final position briefly for clarity.",
        f"\nNote: For precise {sign_language} instruction, consult a certified interpreter resource."
    ]
    return "\n".join(steps)


async def validate_api_key(api_key: str, required_scope: str = "translate") -> dict:
    """Validate API key and check rate limits, scopes, and daily caps."""
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing API key. Include X-Api-Key header.")

    if db is None:
        # Simulate successful validation for demo keys if no DB
        if api_key.startswith("pk_demo"):
            return {"name": "Demo User", "scope": "full", "rate_limit": 100}
        raise HTTPException(status_code=401, detail="Database not connected. Use 'pk_demo' for testing.")

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
    translated = await translate_text(request.text, request.source_language, request.target_language)
    response = TranslationResponse(
        original_text=request.text, translated_text=translated,
        source_language=request.source_language, target_language=request.target_language
    )
    if db is not None:
        try:
            await db.translations.insert_one(response.model_dump())
        except Exception as e:
            logger.error(f"Failed to log translation to DB: {e}")
    return response


@api_router.post("/voice-translate", response_model=VoiceTranslationResponse)
async def voice_translate(request: VoiceTranslationRequest):
    transcribed = await transcribe_audio_demo(request.audio_base64, request.source_language)
    translated = await translate_text(transcribed, request.source_language, request.target_language)
    audio_base64 = await text_to_speech_demo(translated)
    response = VoiceTranslationResponse(
        transcribed_text=transcribed, translated_text=translated, audio_base64=audio_base64,
        source_language=request.source_language, target_language=request.target_language
    )
    save_doc = response.model_dump()
    save_doc.pop('audio_base64', None)
    if db is not None:
        try:
            await db.voice_translations.insert_one(save_doc)
        except Exception as e:
            logger.error(f"Failed to log voice translation to DB: {e}")
    return response


@api_router.post("/sign-to-text", response_model=SignLanguageResponse)
async def sign_to_text(request: SignLanguageRequest):
    interpreted = await interpret_sign_language_demo(request.image_base64, request.target_language)
    response = SignLanguageResponse(interpreted_text=interpreted, target_language=request.target_language)
    if db is not None:
        try:
            await db.sign_interpretations.insert_one(response.model_dump())
        except Exception as e:
            logger.error(f"Failed to log sign interpretation to DB: {e}")
    return response


@api_router.post("/text-to-sign", response_model=TextToSignResponse)
async def text_to_sign(request: TextToSignRequest):
    description = await generate_sign_description(request.text, request.sign_language)
    response = TextToSignResponse(text=request.text, sign_description=description, sign_language=request.sign_language)
    if db is not None:
        try:
            await db.text_to_sign.insert_one(response.model_dump())
        except Exception as e:
            logger.error(f"Failed to log text-to-sign to DB: {e}")
    return response


@api_router.get("/history")
async def get_history(limit: int = 50):
    if db is None:
        return {"history": [], "count": 0, "message": "Demo mode: History disabled."}
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
    if db is not None:
        await db.api_keys.insert_one(doc)
    else:
        logger.warning(f"Demo Key Generated (not persisted): {raw_key}")

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
    translated = await translate_text(request.text, source, request.target_language)
    return {"translated_text": translated, "source_language": request.source_language, "target_language": request.target_language}


@api_router.post("/widget/translate")
async def widget_translate(request: WidgetTranslateRequest, x_api_key: str = Header(None)):
    await validate_api_key(x_api_key, required_scope="translate")
    source = request.source_language if request.source_language != "auto" else "auto-detect"
    translated = await translate_text(request.text, source, request.target_language)
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

        translated = await translate_text(body, "auto-detect", to_language)
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

        translated = await translate_text(speech_result, "auto-detect", "en")
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


# ==================== n8n INTEGRATION WEBHOOK ====================

class N8NWebhookRequest(BaseModel):
    action: str                          # "translate" | "voice-translate" | "sign-to-text"
    text: Optional[str] = None           # Source text for translate / voice
    audio_base64: Optional[str] = None  # Base64 audio for voice-translate
    image_base64: Optional[str] = None  # Base64 image for sign-to-text
    source_language: str = "auto-detect"
    target_language: str = "en"
    from_number: Optional[str] = None   # Originating phone number (WhatsApp etc.)
    metadata: Optional[Dict[str, Any]] = None  # Arbitrary passthrough data

@api_router.post("/webhooks/n8n")
async def n8n_webhook(request: Request, body: N8NWebhookRequest):
    """
    Generic inbound webhook for n8n workflow automation.
    Routes to the correct translation handler based on the `action` field.
    Secured via X-N8N-API-Key header matching the N8N_WEBHOOK_SECRET env var.
    """
    # --- Auth ---
    n8n_secret = os.environ.get("N8N_WEBHOOK_SECRET")
    provided_key = request.headers.get("X-N8N-API-Key", "")
    if n8n_secret and provided_key != n8n_secret:
        logger.warning(f"n8n webhook: invalid API key from {request.client.host}")
        raise HTTPException(status_code=403, detail="Invalid or missing X-N8N-API-Key header")

    try:
        action = body.action.lower().strip()
        logger.info(f"n8n webhook received: action={action}, from={body.from_number}")

        # --- Route: Text Translation ---
        if action == "translate":
            raw_text = (body.text or "").strip()

            # Empty message → return help prompt
            if not raw_text:
                return {
                    "action": "translate",
                    "translated_text": "I didn't receive any text. Send me a message in any language and I'll translate it!\n\nType *hi* or */help* for usage instructions.",
                    "original_text": "",
                    "source_language": "auto-detect",
                    "target_language": "en",
                    "from": body.from_number,
                }

            # Greeting / help request → return welcome message
            if is_greeting(raw_text):
                # Query default language to show in welcome message
                user_pref = None
                if db is not None:
                    try:
                        pref_doc = await db.user_preferences.find_one({"from_number": body.from_number})
                        if pref_doc:
                            user_pref = pref_doc.get("target_language")
                    except Exception:
                        pass
                
                default_lang = user_pref or get_default_language_for_number(body.from_number)
                if default_lang == "en":
                    default_lang = "en (English)"
                    
                dynamic_welcome = WHATSAPP_WELCOME + f"\n\n⚙️ *Current Default Language:* {default_lang.upper()}\n_(Change it by saying: 'set language to Spanish', etc.)_"
                
                return {
                    "action": "translate",
                    "translated_text": dynamic_welcome,
                    "original_text": raw_text,
                    "source_language": "auto-detect",
                    "target_language": "en",
                    "from": body.from_number,
                }

            # Check if setting preference
            pref_lang = is_setting_preference(raw_text)
            if pref_lang:
                if db is not None:
                    try:
                        await db.user_preferences.update_one(
                            {"from_number": body.from_number},
                            {"$set": {"target_language": pref_lang, "updated_at": datetime.now(timezone.utc).isoformat()}},
                            upsert=True
                        )
                    except Exception as e:
                        logger.error(f"Failed to save user preference: {e}")
                return {
                    "action": "translate",
                    "translated_text": f"✅ Your default language has been set to: {pref_lang.upper()}",
                    "original_text": raw_text,
                    "source_language": "auto-detect",
                    "target_language": "en",
                    "from": body.from_number,
                }

            # Query User Memory for default language
            user_pref = None
            if db is not None:
                try:
                    pref_doc = await db.user_preferences.find_one({"from_number": body.from_number})
                    if pref_doc:
                        user_pref = pref_doc.get("target_language")
                except Exception as e:
                    logger.error(f"Failed to read user preference: {e}")

            # Parse natural language patterns → extract text + target language
            parsed_text, src_lang, tgt_lang = parse_whatsapp_message(raw_text, from_number=body.from_number, user_pref=user_pref)
            # Allow explicit overrides from n8n body fields if set
            if body.source_language and body.source_language not in ("auto-detect", "auto", "autodetect"):
                src_lang = body.source_language
            if body.target_language and body.target_language not in ("en", ""):
                tgt_lang = body.target_language

            translated = await translate_text(parsed_text, src_lang, tgt_lang)
            result = {
                "action": "translate",
                "original_text": parsed_text,
                "translated_text": translated,
                "source_language": src_lang,
                "target_language": tgt_lang,
                "from": body.from_number,
            }
            if db is not None:
                try:
                    await db.n8n_events.insert_one({**result, "timestamp": datetime.now(timezone.utc).isoformat()})
                except Exception as e:
                    logger.error(f"n8n webhook DB log error: {e}")
            return result


        # --- Route: Voice Translation ---
        elif action == "voice-translate":
            if not body.audio_base64:
                raise HTTPException(status_code=400, detail="'audio_base64' field is required for action=voice-translate")
            transcribed = await transcribe_audio_demo(body.audio_base64, body.source_language)
            translated = await translate_text(transcribed, body.source_language, body.target_language)
            return {
                "action": "voice-translate",
                "transcribed_text": transcribed,
                "translated_text": translated,
                "source_language": body.source_language,
                "target_language": body.target_language,
            }

        # --- Route: Sign Language to Text ---
        elif action == "sign-to-text":
            if not body.image_base64:
                raise HTTPException(status_code=400, detail="'image_base64' field is required for action=sign-to-text")
            interpreted = await interpret_sign_language_demo(body.image_base64, body.target_language)
            return {
                "action": "sign-to-text",
                "interpreted_text": interpreted,
                "target_language": body.target_language,
            }

        else:
            raise HTTPException(status_code=400, detail=f"Unknown action '{action}'. Valid: translate, voice-translate, sign-to-text")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"n8n webhook error: {e}")
        raise HTTPException(status_code=500, detail="Internal error processing n8n webhook")



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
            {"method": "POST", "path": "/webhooks/n8n", "description": "n8n automation webhook (requires X-N8N-API-Key header)", "auth": True},
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
    if db is not None:
        try:
            await db.translations.create_index([("timestamp", -1)])
            await db.api_keys.create_index([("key_hash", 1)], unique=True)
            await db.api_keys.create_index([("id", 1)])
            logger.info("Database indexes created")
        except Exception as e:
            logger.error(f"Failed to create database indexes (timeout or connection error): {e}")
    else:
        logger.info("Startup: Skipping database index creation (Demo Mode)")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
