import { useState, useRef } from "react";
import axios from "axios";
import { UploadSimple, Camera, Trash, Image as ImageIcon } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SignToText() {
  const [imagePreview, setImagePreview] = useState(null);
  const [interpretedText, setInterpretedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      const base64 = e.target.result.split(",")[1];
      interpretSign(base64);
    };
    reader.readAsDataURL(file);
  };

  const interpretSign = async (base64) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/sign-to-text`, {
        image_base64: base64,
        target_language: "en",
      });
      setInterpretedText(res.data.interpreted_text);
    } catch (e) {
      setError(e.response?.data?.detail || "Sign language interpretation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const clearAll = () => {
    setImagePreview(null);
    setInterpretedText("");
    setError("");
  };

  return (
    <div className="animate-fade-in-up" data-testid="sign-to-text-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl tracking-tighter font-black">Sign Language to Text</h2>
        <button data-testid="sign-clear-btn" onClick={clearAll} className="flex items-center gap-1 px-3 py-2 border border-black text-sm font-bold uppercase tracking-wider hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] transition-colors duration-100">
          <Trash size={16} weight="bold" /> Clear
        </button>
      </div>

      <div className="border border-black p-6 mb-6 bg-[var(--muted)]">
        <p className="text-sm font-semibold text-[var(--muted-foreground)]">
          Upload or capture a photo of sign language gestures. AI will interpret the signs and provide a text translation.
        </p>
      </div>

      <div
        data-testid="sign-dropzone"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-black p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-[var(--muted)] transition-colors duration-100 mb-6"
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadSimple size={48} weight="bold" className="text-[var(--muted-foreground)] mb-4" />
        <p className="text-sm font-bold uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-2">
          Drop image here or click to upload
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">Supports JPG, PNG, WebP</p>
        <input
          ref={fileInputRef}
          data-testid="sign-file-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {imagePreview && (
        <div className="border border-black p-4 mb-6 animate-fade-in-up" data-testid="sign-image-preview">
          <label className="text-xs tracking-[0.2em] uppercase font-bold text-[var(--muted-foreground)] mb-2 block">Uploaded Image</label>
          <img src={imagePreview} alt="Sign language gesture" className="max-h-80 w-auto mx-auto" />
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8" data-testid="sign-loading">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent animate-spin mr-3" />
          <span className="text-sm font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Analyzing sign language...</span>
        </div>
      )}

      {error && (
        <div data-testid="sign-error" className="p-4 border border-[var(--accent)] bg-red-50 text-[var(--accent)] font-semibold mb-4">{error}</div>
      )}

      {interpretedText && (
        <div className="border border-black p-6 bg-[var(--muted)] animate-fade-in-up" data-testid="sign-interpretation-result">
          <label className="text-xs tracking-[0.2em] uppercase font-bold text-[var(--muted-foreground)] mb-2 block">Interpretation</label>
          <p className="font-mono text-lg leading-relaxed whitespace-pre-wrap">{interpretedText}</p>
        </div>
      )}
    </div>
  );
}
