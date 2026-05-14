import phonenumbers
import logging

logger = logging.getLogger(__name__)

# Basic mapping of Country ISO code to primary Language code
COUNTRY_TO_LANG = {
    "BR": "pt", # Brazil -> Portuguese
    "MX": "es", # Mexico -> Spanish
    "ES": "es", # Spain -> Spanish
    "AR": "es", # Argentina -> Spanish
    "CO": "es", # Colombia -> Spanish
    "CL": "es", # Chile -> Spanish
    "PE": "es", # Peru -> Spanish
    "VE": "es", # Venezuela -> Spanish
    "FR": "fr", # France -> French
    "DE": "de", # Germany -> German
    "IT": "it", # Italy -> Italian
    "JP": "ja", # Japan -> Japanese
    "CN": "zh", # China -> Chinese
    "TW": "zh", # Taiwan -> Chinese
    "RU": "ru", # Russia -> Russian
    "IN": "hi", # India -> Hindi (Note: India is highly multilingual, defaulting to Hindi)
    "SA": "ar", # Saudi Arabia -> Arabic
    "AE": "ar", # UAE -> Arabic
    "EG": "ar", # Egypt -> Arabic
    "KR": "ko", # South Korea -> Korean
    "PT": "pt", # Portugal -> Portuguese
    "TR": "tr", # Turkey -> Turkish
    "NL": "nl", # Netherlands -> Dutch
    "PL": "pl", # Poland -> Polish
    "ID": "id", # Indonesia -> Indonesian
    "TH": "th", # Thailand -> Thai
    "VN": "vi", # Vietnam -> Vietnamese
    # Fallback default will be 'en' for unmapped or ambiguous countries (like US, UK, CA, AU)
}

def get_default_language_for_number(phone_number: str) -> str:
    """
    Parses an E.164 phone number (e.g., 'whatsapp:+525512345678' or '+52...')
    and returns a default language code ('es', 'fr', etc.).
    Returns 'en' as the absolute fallback.
    """
    if not phone_number:
        return "en"
        
    # Strip 'whatsapp:' prefix if present
    clean_number = phone_number.replace("whatsapp:", "").strip()
    
    # Ensure it has a + prefix for phonenumbers library
    if not clean_number.startswith('+'):
        clean_number = '+' + clean_number
        
    try:
        parsed_number = phonenumbers.parse(clean_number)
        region_code = phonenumbers.region_code_for_number(parsed_number)
        
        if region_code and region_code in COUNTRY_TO_LANG:
            return COUNTRY_TO_LANG[region_code]
            
    except phonenumbers.NumberParseException as e:
        logger.warning(f"Could not parse phone number for locale: {clean_number} - {e}")
        
    # Default fallback
    return "en"
