import { useState, useRef } from "react";
import axios from "axios";
import { Microphone, Stop, Play, Trash, CaretDown, Check } from "@phosphor-icons/react";

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
];

function LangSelect({ value, onChange, label, testId }) {
  const [open, setOpen] = useState(false);
  const selected = LANGUAGES.find((l) => l.code === value);
  return (
    <div className="relative flex-1">
      <label className="text-xs tracking-[0.2em] uppercase font-bold text-[var(--muted-foreground)] mb-1 block">{label}</label>
      <button data-testid={testId} onClick={() => setOpen(!open)} className="w-full flex items-center justify-between border border-black p-4 bg-white hover:bg-[var(--muted)] transition-colors duration-100">
        <span className="font-semibold">{selected?.name || value}</span>
        <CaretDown size={16} weight="bold" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-40 top-full left-0 right-0 border border-black bg-white max-h-64 overflow-y-auto">
          {LANGUAGES.map((lang) => (
            <button key={lang.code} onClick={() => { onChange(lang.code); setOpen(false); }} className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--foreground)] hover:text-white transition-colors duration-100 border-b border-[var(--secondary)]">
              <span>{lang.name}</span>
              {value === lang.code && <Check size={16} weight="bold" className="text-[var(--primary)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VoiceTranslate() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [audioBase64, setAudioBase64] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(",")[1];
          processAudio(base64);
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Microphone access denied. Please allow microphone permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (base64) => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API}/voice-translate`, {
        audio_base64: base64,
        source_language: sourceLang,
        target_language: targetLang,
      });
      setTranscribedText(res.data.transcribed_text);
      setTranslatedText(res.data.translated_text);
      setAudioBase64(res.data.audio_base64 || "");
    } catch (e) {
      setError(e.response?.data?.detail || "Voice translation failed");
    } finally {
      setLoading(false);
    }
  };

  const playAudio = () => {
    if (!audioBase64) return;
    const byteChars = atob(audioBase64);
    const byteArr = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteArr], { type: "audio/mp3" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  };

  const clearAll = () => {
    setTranscribedText("");
    setTranslatedText("");
    setAudioBase64("");
    setError("");
  };

  return (
    <div className="animate-fade-in-up" data-testid="voice-translate-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl tracking-tighter font-black">Voice Translation</h2>
        <button data-testid="voice-clear-btn" onClick={clearAll} className="flex items-center gap-1 px-3 py-2 border border-black text-sm font-bold uppercase tracking-wider hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-colors duration-100">
          <Trash size={16} weight="bold" /> Clear
        </button>
      </div>

      <div className="flex items-end gap-3 mb-8">
        <LangSelect value={sourceLang} onChange={setSourceLang} label="From" testId="voice-source-lang" />
        <div className="px-2 py-3 text-[var(--muted-foreground)] font-bold">&rarr;</div>
        <LangSelect value={targetLang} onChange={setTargetLang} label="To" testId="voice-target-lang" />
      </div>

      <div className="flex flex-col items-center py-12 border border-black bg-white mb-6">
        <button
          data-testid="record-button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
          className={`w-28 h-28 flex items-center justify-center border-2 transition-colors duration-100 ${
            isRecording
              ? "bg-[var(--accent)] border-[var(--accent)] text-white animate-pulse-record"
              : "bg-[var(--primary)] border-[var(--primary)] text-white hover:bg-[var(--foreground)] hover:border-[var(--foreground)]"
          } disabled:opacity-40`}
        >
          {isRecording ? <Stop size={48} weight="fill" /> : <Microphone size={48} weight="bold" />}
        </button>
        <p className="mt-4 text-sm font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
          {isRecording ? "Recording... Tap to stop" : loading ? "Processing..." : "Tap to record"}
        </p>
        {loading && <div className="mt-4 w-6 h-6 border-2 border-[var(--primary)] border-t-transparent animate-spin" />}
      </div>

      {error && (
        <div data-testid="voice-error" className="mb-4 p-4 border border-[var(--accent)] bg-red-50 text-[var(--accent)] font-semibold">{error}</div>
      )}

      {transcribedText && (
        <div className="border border-black p-6 mb-4 animate-fade-in-up" data-testid="transcribed-text">
          <label className="text-xs tracking-[0.2em] uppercase font-bold text-[var(--muted-foreground)] mb-2 block">What you said</label>
          <p className="font-mono text-lg">{transcribedText}</p>
        </div>
      )}

      {translatedText && (
        <div className="border border-black p-6 bg-[var(--muted)] animate-fade-in-up" data-testid="voice-translated-text">
          <label className="text-xs tracking-[0.2em] uppercase font-bold text-[var(--muted-foreground)] mb-2 block">Translation</label>
          <p className="font-mono text-lg mb-4">{translatedText}</p>
          {audioBase64 && (
            <button
              data-testid="play-audio-btn"
              onClick={playAudio}
              className="flex items-center gap-2 px-4 py-2 border border-black bg-white font-bold text-sm uppercase tracking-wider hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-colors duration-100"
            >
              <Play size={18} weight="fill" /> Play Translation
            </button>
          )}
        </div>
      )}
    </div>
  );
}
