from utils.locale_helper import get_default_language_for_number

def test_get_default_language_for_number():
    # Test valid countries
    assert get_default_language_for_number("whatsapp:+525512345678") == "es" # Mexico
    assert get_default_language_for_number("+5511999999999") == "pt" # Brazil
    assert get_default_language_for_number("+33612345678") == "fr" # France
    assert get_default_language_for_number("whatsapp:+819012345678") == "ja" # Japan
    
    # Test ambiguous/unmapped countries (fallback to en)
    assert get_default_language_for_number("+14155552671") == "en" # US
    assert get_default_language_for_number("+447911123456") == "en" # UK
    
    # Test invalid numbers
    assert get_default_language_for_number("not_a_number") == "en"
    assert get_default_language_for_number("") == "en"
    assert get_default_language_for_number(None) == "en"
