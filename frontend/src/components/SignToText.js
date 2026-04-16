import { useState, useRef } from "react";
import axios from "axios";
import { UploadSimple, Camera, Trash, Image as ImageIcon, Info } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SignToText() {
  const [imagePreview, setImagePreview] = useState(null);
  const [interpretedText, setInterpretedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      interpretSign(e.target.result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const interpretSign = async (base64) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/sign-to-text`, { image_base64: base64, target_language: "en" });
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

  const clearAll = () => { setImagePreview(null); setInterpretedText(""); setError(""); };

  return (
    <div className="animate-fade-in" data-testid="sign-to-text-page">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold">Sign Language to Text</h2>
        <button data-testid="sign-clear-btn" onClick={clearAll} className="p-2 rounded-lg text-[var(--accent)] hover:bg-red-50 transition-colors">
          <Trash size={20} weight="bold" />
        </button>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-[var(--primary-light)] rounded-2xl p-4 mb-5">
        <Info size={20} weight="fill" className="text-[var(--primary)] shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--primary)] font-medium leading-relaxed">
          Capture or upload a photo of sign language gestures to interpret them using AI.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          data-testid="sign-take-photo-btn"
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-[var(--primary)] bg-white text-[var(--primary)] font-semibold text-sm hover:bg-[var(--primary-light)] transition-all duration-200"
        >
          <Camera size={28} weight="duotone" />
          Take Photo
        </button>
        <button
          data-testid="sign-choose-gallery-btn"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-2 py-6 rounded-2xl border-2 border-[var(--primary)] bg-white text-[var(--primary)] font-semibold text-sm hover:bg-[var(--primary-light)] transition-all duration-200"
        >
          <ImageIcon size={28} weight="duotone" />
          Choose from Gallery
        </button>
      </div>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
      <input ref={fileInputRef} data-testid="sign-file-input" type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />

      {/* Drop Zone */}
      <div
        data-testid="sign-dropzone"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-[var(--border)] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary-light)] transition-all duration-200 mb-5"
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadSimple size={36} weight="duotone" className="text-[var(--muted-light)] mb-3" />
        <p className="text-sm font-medium text-[var(--muted)]">Or drag & drop an image here</p>
        <p className="text-xs text-[var(--muted-light)] mt-1">JPG, PNG, WebP supported</p>
      </div>

      {imagePreview && (
        <div className="bg-white rounded-2xl border border-[var(--border)] p-4 mb-5 shadow-sm animate-fade-in" data-testid="sign-image-preview">
          <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3 block">Uploaded Image</label>
          <img src={imagePreview} alt="Sign language gesture" className="max-h-72 w-auto mx-auto rounded-xl" />
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 gap-3" data-testid="sign-loading">
          <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-[var(--muted)]">Analyzing sign language...</span>
        </div>
      )}

      {error && (
        <div data-testid="sign-error" className="p-4 rounded-xl bg-red-50 text-[var(--accent)] text-sm font-medium mb-4">{error}</div>
      )}

      {interpretedText && (
        <div className="bg-[var(--primary-light)] rounded-2xl border border-indigo-200 p-5 animate-fade-in" data-testid="sign-interpretation-result">
          <label className="text-xs font-semibold text-[var(--primary)] uppercase tracking-wider mb-2 block">Interpretation</label>
          <p className="text-base leading-relaxed whitespace-pre-wrap">{interpretedText}</p>
        </div>
      )}
    </div>
  );
}
