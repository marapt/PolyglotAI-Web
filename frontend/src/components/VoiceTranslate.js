import { useState, useRef } from "react";
import axios from "axios";
import { Microphone, Stop, Play, Trash, CaretDown, Check, ArrowRight } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LANGUAGES = [
  { code: "en", name: "English" }, { code: "es", name: "Spanish" },
  { code: "fr", name: "French" }, { code: "de", name: "German" },
  { code: "zh", name: "Chinese" }, { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" }, { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" }, { code: "pt", name: "Portuguese" },
];

function LangSelect({ value, onChange, testId }) {
  const [open, setOpen] = useState(false);
  const selected = LANGUAGES.find((l) => l.code === value);
  return (
    <div className="relative flex-1">
      <button data-testid={testId} onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-xl border border-[var(--border)] bg-white px-4 py-3.5 hover:border-[var(--primary)] transition-all duration-200">
        <span className="font-semibold text-sm">{selected?.name || value}</span>
        <CaretDown size={14} weight="bold" className={`text-[var(--muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-1 left-0 right-0 rounded-xl border border-[var(--border)] bg-white shadow-lg max-h-60 overflow-y-auto">
          {LANGUAGES.map((lang) => (
            <button key={lang.code} onClick={() => { onChange(lang.code); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-[var(--primary-light)] transition-colors duration-150 border-b border-[var(--border-light)] last:border-b-0">
              <span className="font-medium">{lang.name}</span>
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
        reader.onloadend = () => { processAudio(reader.result.split(",")[1]); };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
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
        audio_base64: base64, source_language: sourceLang, target_language: targetLang,
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
    new Audio(URL.createObjectURL(blob)).play();
  };

  const clearAll = () => { setTranscribedText(""); setTranslatedText(""); setAudioBase64(""); setError(""); };

  return (
    <div className="animate-fade-in" data-testid="voice-translate-page">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold">Voice Translation</h2>
        <button data-testid="voice-clear-btn" onClick={clearAll} className="p-2 rounded-lg text-[var(--accent)] hover:bg-red-50 transition-colors">
          <Trash size={20} weight="bold" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <LangSelect value={sourceLang} onChange={setSourceLang} testId="voice-source-lang" />
        <div className="shrink-0 text-[var(--primary)]"><ArrowRight size={18} weight="bold" /></div>
        <LangSelect value={targetLang} onChange={setTargetLang} testId="voice-target-lang" />
      </div>

      {/* Record Button */}
      <div className="flex flex-col items-center py-10 bg-white rounded-2xl border border-[var(--border)] shadow-sm mb-5">
        <button
          data-testid="record-button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
          className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200 ${
            isRecording
              ? "bg-[var(--accent)] shadow-lg shadow-red-200 animate-recording-pulse"
              : "bg-[var(--primary)] shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:scale-105"
          } disabled:opacity-40 text-white`}
        >
          {isRecording ? <Stop size={44} weight="fill" /> : <Microphone size={44} weight="bold" />}
        </button>
        <p className="mt-4 text-sm font-medium text-[var(--muted)]">
          {isRecording ? "Tap to stop recording" : loading ? "Processing your audio..." : "Tap to start recording"}
        </p>
        {loading && <div className="mt-3 w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />}
      </div>

      {error && (
        <div data-testid="voice-error" className="p-4 rounded-xl bg-red-50 text-[var(--accent)] text-sm font-medium mb-4">{error}</div>
      )}

      {transcribedText && (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5 mb-4 shadow-sm animate-fade-in" data-testid="transcribed-text">
          <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2 block">What You Said</label>
          <p className="text-base leading-relaxed">{transcribedText}</p>
        </div>
      )}

      {translatedText && (
        <div className="bg-[var(--primary-light)] rounded-2xl border border-indigo-200 p-5 animate-fade-in" data-testid="voice-translated-text">
          <label className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-2 block">Translation</label>
          <p className="text-base leading-relaxed mb-4">{translatedText}</p>
          {audioBase64 && (
            <button data-testid="play-audio-btn" onClick={playAudio}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[var(--border)] text-[var(--primary)] font-semibold text-sm hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-all duration-200">
              <Play size={16} weight="fill" /> Play Translation
            </button>
          )}
        </div>
      )}
    </div>
  );
}
