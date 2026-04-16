import { useState } from "react";
import axios from "axios";
import { ArrowsLeftRight, Translate, Trash, CaretDown, Check } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LANGUAGES = [
  { code: "en", name: "English" }, { code: "es", name: "Spanish" },
  { code: "fr", name: "French" }, { code: "de", name: "German" },
  { code: "zh", name: "Chinese" }, { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" }, { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" }, { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" }, { code: "it", name: "Italian" },
  { code: "nl", name: "Dutch" }, { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" }, { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" }, { code: "sv", name: "Swedish" },
];

function LanguagePicker({ value, onChange, testId }) {
  const [open, setOpen] = useState(false);
  const selected = LANGUAGES.find((l) => l.code === value);

  return (
    <div className="relative flex-1">
      <button
        data-testid={testId}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-xl border border-[var(--border)] bg-white px-4 py-3.5 hover:border-[var(--primary)] transition-all duration-200"
      >
        <span className="font-semibold text-sm">{selected?.name || value}</span>
        <CaretDown size={14} weight="bold" className={`text-[var(--muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-1 left-0 right-0 rounded-xl border border-[var(--border)] bg-white shadow-lg max-h-60 overflow-y-auto" data-testid={`${testId}-dropdown`}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              data-testid={`${testId}-option-${lang.code}`}
              onClick={() => { onChange(lang.code); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-[var(--primary-light)] transition-colors duration-150 border-b border-[var(--border-light)] last:border-b-0"
            >
              <span className="font-medium">{lang.name}</span>
              {value === lang.code && <Check size={16} weight="bold" className="text-[var(--primary)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TextTranslate() {
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API}/translate`, {
        text: inputText, source_language: sourceLang, target_language: targetLang,
      });
      setTranslatedText(res.data.translated_text);
    } catch (e) {
      setError(e.response?.data?.detail || "Translation failed");
    } finally {
      setLoading(false);
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  const clearAll = () => { setInputText(""); setTranslatedText(""); setError(""); };

  return (
    <div className="animate-fade-in" data-testid="text-translate-page">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold">Text Translation</h2>
        <button data-testid="text-clear-btn" onClick={clearAll} className="p-2 rounded-lg text-[var(--accent)] hover:bg-red-50 transition-colors">
          <Trash size={20} weight="bold" />
        </button>
      </div>

      {/* Language Selectors */}
      <div className="flex items-center gap-2 mb-5">
        <LanguagePicker value={sourceLang} onChange={setSourceLang} testId="source-lang-picker" />
        <button data-testid="swap-languages-btn" onClick={swapLanguages} aria-label="Swap languages"
          className="p-2.5 rounded-full hover:bg-[var(--primary-light)] text-[var(--primary)] transition-colors duration-200 shrink-0">
          <ArrowsLeftRight size={20} weight="bold" />
        </button>
        <LanguagePicker value={targetLang} onChange={setTargetLang} testId="target-lang-picker" />
      </div>

      {/* Input */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-5 mb-4 shadow-sm">
        <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 block">Enter Text</label>
        <textarea
          data-testid="source-text-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type or paste text here..."
          className="w-full h-36 bg-transparent text-base resize-none focus:outline-none placeholder:text-[var(--muted-light)]"
        />
      </div>

      {/* Translate Button */}
      <button data-testid="translate-button" onClick={handleTranslate} disabled={loading || !inputText.trim()}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[var(--primary)] text-white font-semibold text-sm tracking-wide hover:bg-[var(--primary-hover)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-200 mb-4">
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <><Translate size={18} weight="bold" /> Translate</>
        )}
      </button>

      {error && (
        <div data-testid="text-translate-error" className="p-4 rounded-xl bg-red-50 text-[var(--accent)] text-sm font-medium mb-4">{error}</div>
      )}

      {/* Translation Result */}
      {translatedText && (
        <div className="bg-[var(--primary-light)] rounded-2xl border border-indigo-200 p-5 shadow-sm animate-fade-in" data-testid="translated-text-output">
          <label className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-2 block">Translation</label>
          <p className="text-base leading-relaxed">{translatedText}</p>
        </div>
      )}
    </div>
  );
}
