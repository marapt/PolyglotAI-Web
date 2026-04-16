import { useState } from "react";
import axios from "axios";
import { HandPalm, Trash, CaretDown, Check } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SIGN_LANGUAGES = [
  { code: "ASL", name: "American Sign Language" },
  { code: "BSL", name: "British Sign Language" },
  { code: "ISL", name: "Indian Sign Language" },
  { code: "JSL", name: "Japanese Sign Language" },
  { code: "LSF", name: "French Sign Language" },
  { code: "Auslan", name: "Australian Sign Language" },
  { code: "DGS", name: "German Sign Language" },
  { code: "CSL", name: "Chinese Sign Language" },
];

export default function TextToSign() {
  const [inputText, setInputText] = useState("");
  const [signDescription, setSignDescription] = useState("");
  const [selectedLang, setSelectedLang] = useState("ASL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const handleConvert = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API}/text-to-sign`, {
        text: inputText,
        sign_language: selectedLang,
      });
      setSignDescription(res.data.sign_description);
    } catch (e) {
      setError(e.response?.data?.detail || "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setInputText("");
    setSignDescription("");
    setError("");
  };

  const selectedName = SIGN_LANGUAGES.find((l) => l.code === selectedLang)?.name || selectedLang;

  return (
    <div className="animate-fade-in-up" data-testid="text-to-sign-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl tracking-tighter font-black">Text to Sign Language</h2>
        <button data-testid="t2s-clear-btn" onClick={clearAll} className="flex items-center gap-1 px-3 py-2 border border-black text-sm font-bold uppercase tracking-wider hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-colors duration-100">
          <Trash size={16} weight="bold" /> Clear
        </button>
      </div>

      <div className="border border-black p-6 mb-6 bg-[var(--muted)]">
        <p className="text-sm font-semibold text-[var(--muted-foreground)]">
          Enter text and get step-by-step instructions on how to sign it in your chosen sign language.
        </p>
      </div>

      <div className="mb-6 relative">
        <label className="text-xs tracking-[0.2em] uppercase font-bold text-[var(--muted-foreground)] mb-1 block">Sign Language</label>
        <button
          data-testid="sign-lang-picker"
          onClick={() => setShowPicker(!showPicker)}
          className="w-full md:w-80 flex items-center justify-between border border-black p-4 bg-white hover:bg-[var(--muted)] transition-colors duration-100"
        >
          <span className="font-semibold">{selectedName}</span>
          <CaretDown size={16} weight="bold" className={`transition-transform ${showPicker ? "rotate-180" : ""}`} />
        </button>
        {showPicker && (
          <div className="absolute z-40 top-full left-0 w-full md:w-80 border border-black bg-white max-h-64 overflow-y-auto" data-testid="sign-lang-dropdown">
            {SIGN_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                data-testid={`sign-lang-option-${lang.code}`}
                onClick={() => { setSelectedLang(lang.code); setShowPicker(false); }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--foreground)] hover:text-white transition-colors duration-100 border-b border-[var(--secondary)]"
              >
                <span>{lang.name}</span>
                {selectedLang === lang.code && <Check size={16} weight="bold" className="text-[var(--primary)]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border border-black p-6 mb-6">
        <label className="text-xs tracking-[0.2em] uppercase font-bold text-[var(--muted-foreground)] mb-2 block">Enter Text</label>
        <textarea
          data-testid="t2s-text-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type the text you want to sign..."
          className="w-full h-32 bg-transparent font-mono text-lg resize-none focus:outline-none"
        />
      </div>

      <button
        data-testid="convert-to-sign-btn"
        onClick={handleConvert}
        disabled={loading || !inputText.trim()}
        className="w-full flex items-center justify-center gap-2 p-4 bg-[var(--primary)] text-white font-bold text-sm uppercase tracking-[0.2em] hover:bg-[var(--foreground)] transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed mb-6"
      >
        <HandPalm size={20} weight="bold" />
        {loading ? "Converting..." : "Convert to Sign Language"}
      </button>

      {error && (
        <div data-testid="t2s-error" className="p-4 border border-[var(--accent)] bg-red-50 text-[var(--accent)] font-semibold mb-4">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8" data-testid="t2s-loading">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        </div>
      )}

      {signDescription && (
        <div className="border border-black p-6 bg-[var(--muted)] animate-fade-in-up" data-testid="sign-description-result">
          <label className="text-xs tracking-[0.2em] uppercase font-bold text-[var(--muted-foreground)] mb-2 block">
            How to Sign in {selectedName}
          </label>
          <p className="font-mono text-base leading-relaxed whitespace-pre-wrap">{signDescription}</p>
        </div>
      )}
    </div>
  );
}
