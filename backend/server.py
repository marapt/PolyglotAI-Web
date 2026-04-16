from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import base64
import io

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


async def translate_with_openai(text: str, source_lang: str, target_lang: str) -> str:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"translate_{uuid.uuid4()}",
        system_message=f"You are a professional translator. Translate the given text from {source_lang} to {target_lang}. Only provide the translation, no explanations."
    ).with_model("openai", "gpt-4o-mini")
    user_message = UserMessage(text=text)
    response = await chat.send_message(user_message)
    return response


async def transcribe_audio_openai(audio_base64: str, language: str) -> str:
    from openai import AsyncOpenAI
    openai_client = AsyncOpenAI(api_key=EMERGENT_LLM_KEY, base_url="https://emergentintegrations-production.up.railway.app/api/v1")
    audio_bytes = base64.b64decode(audio_base64)
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = "audio.webm"
    transcription = await openai_client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        language=language if language != "auto" else None
    )
    return transcription.text


async def text_to_speech_openai(text: str) -> str:
    from openai import AsyncOpenAI
    openai_client = AsyncOpenAI(api_key=EMERGENT_LLM_KEY, base_url="https://emergentintegrations-production.up.railway.app/api/v1")
    response = await openai_client.audio.speech.create(
        model="tts-1",
        voice="nova",
        input=text
    )
    audio_bytes = response.content
    return base64.b64encode(audio_bytes).decode('utf-8')


async def interpret_sign_language(image_base64: str, target_lang: str) -> str:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"sign_{uuid.uuid4()}",
        system_message=f"You are an expert in sign language interpretation. Analyze the image and describe what sign language gestures you see, then provide the meaning in {target_lang}. Be specific and accurate."
    ).with_model("openai", "gpt-4o")
    user_message = UserMessage(
        text="What sign language gesture is being shown in this image? Provide the interpretation.",
        image_urls=[f"data:image/jpeg;base64,{image_base64}"]
    )
    response = await chat.send_message(user_message)
    return response


async def generate_sign_description(text: str, sign_language: str) -> str:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"sign_desc_{uuid.uuid4()}",
        system_message=f"You are an expert in {sign_language} (Sign Language). Describe step-by-step how to sign the given text in {sign_language}, including hand shapes, movements, and facial expressions."
    ).with_model("openai", "gpt-4o-mini")
    user_message = UserMessage(text=f"How do I sign: '{text}'")
    response = await chat.send_message(user_message)
    return response


@api_router.get("/")
async def root():
    return {"message": "Polyglot AI Translation API", "status": "active"}


@api_router.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    logger.info(f"Translation: {request.source_language} -> {request.target_language}")
    translated = await translate_with_openai(request.text, request.source_language, request.target_language)
    response = TranslationResponse(
        original_text=request.text,
        translated_text=translated,
        source_language=request.source_language,
        target_language=request.target_language
    )
    doc = response.model_dump()
    await db.translations.insert_one(doc)
    return response


@api_router.post("/voice-translate", response_model=VoiceTranslationResponse)
async def voice_translate(request: VoiceTranslationRequest):
    logger.info(f"Voice translation: {request.source_language} -> {request.target_language}")
    transcribed = await transcribe_audio_openai(request.audio_base64, request.source_language)
    translated = await translate_with_openai(transcribed, request.source_language, request.target_language)
    audio_base64 = await text_to_speech_openai(translated)
    response = VoiceTranslationResponse(
        transcribed_text=transcribed,
        translated_text=translated,
        audio_base64=audio_base64,
        source_language=request.source_language,
        target_language=request.target_language
    )
    save_doc = response.model_dump()
    save_doc.pop('audio_base64', None)
    await db.voice_translations.insert_one(save_doc)
    return response


@api_router.post("/sign-to-text", response_model=SignLanguageResponse)
async def sign_to_text(request: SignLanguageRequest):
    logger.info(f"Sign language interpretation to {request.target_language}")
    interpreted = await interpret_sign_language(request.image_base64, request.target_language)
    response = SignLanguageResponse(
        interpreted_text=interpreted,
        target_language=request.target_language
    )
    doc = response.model_dump()
    await db.sign_interpretations.insert_one(doc)
    return response


@api_router.post("/text-to-sign", response_model=TextToSignResponse)
async def text_to_sign(request: TextToSignRequest):
    logger.info(f"Text to {request.sign_language} conversion")
    description = await generate_sign_description(request.text, request.sign_language)
    response = TextToSignResponse(
        text=request.text,
        sign_description=description,
        sign_language=request.sign_language
    )
    doc = response.model_dump()
    await db.text_to_sign.insert_one(doc)
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
        "ASL": "American Sign Language",
        "BSL": "British Sign Language",
        "ISL": "Indian Sign Language",
        "JSL": "Japanese Sign Language",
        "LSF": "French Sign Language",
        "Auslan": "Australian Sign Language",
        "DGS": "German Sign Language",
        "CSL": "Chinese Sign Language"
    }
    return {"spoken_languages": languages, "sign_languages": sign_languages}


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
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
