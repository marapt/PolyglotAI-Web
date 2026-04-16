import { useState } from "react";
import axios from "axios";
import { HandPalm, Trash, CaretDown, Check, Info } from "@phosphor-icons/react";

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
      const res = await axios.post(`${API}/text-to-sign`, { text: inputText, sign_language: selectedLang });
      setSignDescription(res.data.sign_description);
    } catch (e) {
      setError(e.response?.data?.detail || "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => { setInputText(""); setSignDescription(""); setError(""); };
  const selectedName = SIGN_LANGUAGES.find((l) => l.code === selectedLang)?.name || selectedLang;

  return (
    <div className="animate-fade-in" data-testid="text-to-sign-page">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold">Text to Sign Language</h2>
        <button data-testid="t2s-clear-btn" onClick={clearAll} className="p-2 rounded-lg text-[var(--accent)] hover:bg-red-50 transition-colors">
          <Trash size={20} weight="bold" />
        </button>
      </div>

      <div className="flex items-start gap-3 bg-[var(--primary-light)] rounded-2xl p-4 mb-5">
        <Info size={20} weight="fill" className="text-[var(--primary)] shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--primary)] font-medium leading-relaxed">
          Enter text and get step-by-step instructions on how to sign it.
        </p>
      </div>

      {/* Sign Language Picker */}
      <div className="mb-5 relative">
        <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 block">Sign Language</label>
        <button data-testid="sign-lang-picker" onClick={() => setShowPicker(!showPicker)}
          className="w-full flex items-center justify-between rounded-xl border border-[var(--border)] bg-white px-4 py-3.5 hover:border-[var(--primary)] transition-all duration-200">
          <span className="font-semibold text-sm">{selectedName}</span>
          <CaretDown size={14} weight="bold" className={`text-[var(--muted)] transition-transform duration-200 ${showPicker ? "rotate-180" : ""}`} />
        </button>
        {showPicker && (
          <div className="absolute z-40 top-full mt-1 left-0 right-0 rounded-xl border border-[var(--border)] bg-white shadow-lg max-h-60 overflow-y-auto" data-testid="sign-lang-dropdown">
            {SIGN_LANGUAGES.map((lang) => (
              <button key={lang.code} data-testid={`sign-lang-option-${lang.code}`}
                onClick={() => { setSelectedLang(lang.code); setShowPicker(false); }}
                className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-[var(--primary-light)] transition-colors duration-150 border-b border-[var(--border-light)] last:border-b-0">
                <span className="font-medium">{lang.name}</span>
                {selectedLang === lang.code && <Check size={16} weight="bold" className="text-[var(--primary)]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Text Input */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-5 mb-5 shadow-sm">
        <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 block">Enter Text</label>
        <textarea data-testid="t2s-text-input" value={inputText} onChange={(e) => setInputText(e.target.value)}
          placeholder="Type the text you want to sign..."
          className="w-full h-28 bg-transparent text-base resize-none focus:outline-none placeholder:text-[var(--muted-light)]" />
      </div>

      <button data-testid="convert-to-sign-btn" onClick={handleConvert} disabled={loading || !inputText.trim()}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[var(--primary)] text-white font-semibold text-sm tracking-wide hover:bg-[var(--primary-hover)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-200 mb-5">
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <><HandPalm size={18} weight="bold" /> Convert to Sign Language</>
        )}
      </button>

      {error && (
        <div data-testid="t2s-error" className="p-4 rounded-xl bg-red-50 text-[var(--accent)] text-sm font-medium mb-4">{error}</div>
      )}

      {signDescription && (
        <div className="bg-[var(--primary-light)] rounded-2xl border border-indigo-200 p-5 animate-fade-in" data-testid="sign-description-result">
          <label className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-2 block">
            How to Sign in {selectedName}
          </label>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{signDescription}</p>
        </div>
      )}
    </div>
  );
}
