import { useState } from "react";
import axios from "axios";
import { ArrowsLeftRight, Translate, Trash, CaretDown, Check } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "it", name: "Italian" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" },
  { code: "sv", name: "Swedish" },
];

function LanguagePicker({ value, onChange, label, testId }) {
  const [open, setOpen] = useState(false);
  const selected = LANGUAGES.find((l) => l.code === value);

  return (
    <div className="relative flex-1">
      <label className="text-xs tracking-[0.2em] uppercase font-bold text-[var(--muted-foreground)] mb-1 block">
        {label}
      </label>
      <button
        data-testid={testId}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border border-black p-4 bg-white hover:bg-[var(--muted)] transition-colors duration-100"
      >
        <span className="font-semibold">{selected?.name || value}</span>
        <CaretDown size={16} weight="bold" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-40 top-full left-0 right-0 border border-black bg-white max-h-64 overflow-y-auto" data-testid={`${testId}-dropdown`}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              data-testid={`${testId}-option-${lang.code}`}
              onClick={() => { onChange(lang.code); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--foreground)] hover:text-white transition-colors duration-100 border-b border-[var(--secondary)]"
            >
              <span>{lang.name}</span>
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
        text: inputText,
        source_language: sourceLang,
        target_language: targetLang,
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

  const clearAll = () => {
    setInputText("");
    setTranslatedText("");
    setError("");
  };

  return (
    <div className="animate-fade-in-up" data-testid="text-translate-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl tracking-tighter font-black">Text Translation</h2>
        <button
          data-testid="text-clear-btn"
          onClick={clearAll}
          className="flex items-center gap-1 px-3 py-2 border border-black text-sm font-bold uppercase tracking-wider hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-colors duration-100"
        >
          <Trash size={16} weight="bold" /> Clear
        </button>
      </div>

      <div className="flex items-end gap-3 mb-6">
        <LanguagePicker value={sourceLang} onChange={setSourceLang} label="From" testId="source-lang-picker" />
        <button
          data-testid="swap-languages-btn"
          onClick={swapLanguages}
          aria-label="Swap languages"
          className="mb-0 p-3 border border-black hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-colors duration-100"
        >
          <ArrowsLeftRight size={20} weight="bold" />
        </button>
        <LanguagePicker value={targetLang} onChange={setTargetLang} label="To" testId="target-lang-picker" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-black">
        <div className="border-b md:border-b-0 md:border-r border-black p-6">
          <label className="text-xs tracking-[0.2em] uppercase font-bold text-[var(--muted-foreground)] mb-2 block">
            Source Text
          </label>
          <textarea
            data-testid="source-text-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type or paste text here..."
            className="w-full h-48 bg-transparent font-mono text-lg resize-none focus:outline-none"
          />
        </div>
        <div className="p-6 bg-[var(--muted)]">
          <label className="text-xs tracking-[0.2em] uppercase font-bold text-[var(--muted-foreground)] mb-2 block">
            Translation
          </label>
          {loading ? (
            <div className="h-48 flex items-center justify-center" data-testid="text-translate-loading">
              <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent animate-spin" />
            </div>
          ) : (
            <p data-testid="translated-text-output" className="font-mono text-lg leading-relaxed min-h-[12rem] whitespace-pre-wrap">
              {translatedText || <span className="text-[var(--muted-foreground)]">Translation will appear here...</span>}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div data-testid="text-translate-error" className="mt-4 p-4 border border-[var(--accent)] bg-red-50 text-[var(--accent)] font-semibold">
          {error}
        </div>
      )}

      <button
        data-testid="translate-button"
        onClick={handleTranslate}
        disabled={loading || !inputText.trim()}
        className="mt-6 w-full flex items-center justify-center gap-2 p-4 bg-[var(--primary)] text-white font-bold text-sm uppercase tracking-[0.2em] hover:bg-[var(--foreground)] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Translate size={20} weight="bold" />
        {loading ? "Translating..." : "Translate"}
      </button>
    </div>
  );
}
