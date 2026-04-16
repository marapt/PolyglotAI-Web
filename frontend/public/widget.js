// PolyglotAI Translation Widget v1.0
// Usage: Add this script to any webpage to enable instant text translation
// Configure via window.PolyglotConfig before loading this script
(function () {
  "use strict";

  const config = window.PolyglotConfig || {};
  const API_KEY = config.apiKey || "";
  const API_URL = config.apiUrl || "";
  const POSITION = config.position || "bottom-right";
  const DEFAULT_TARGET = config.defaultTarget || "en";

  if (!API_KEY || !API_URL) {
    console.warn("[PolyglotAI] Missing apiKey or apiUrl in window.PolyglotConfig");
    return;
  }

  const LANGUAGES = [
    { code: "en", name: "English" }, { code: "es", name: "Spanish" },
    { code: "fr", name: "French" }, { code: "de", name: "German" },
    { code: "zh", name: "Chinese" }, { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" }, { code: "ar", name: "Arabic" },
    { code: "hi", name: "Hindi" }, { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" }, { code: "it", name: "Italian" },
  ];

  // Inject styles
  const style = document.createElement("style");
  style.textContent = `
    #polyglot-widget-btn {
      position: fixed;
      ${POSITION.includes("bottom") ? "bottom: 20px;" : "top: 20px;"}
      ${POSITION.includes("right") ? "right: 20px;" : "left: 20px;"}
      width: 52px; height: 52px;
      border-radius: 16px;
      background: #4F46E5;
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(79, 70, 229, 0.35);
      z-index: 999998;
      transition: transform 0.2s, box-shadow 0.2s;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    #polyglot-widget-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(79, 70, 229, 0.45);
    }
    #polyglot-widget-btn svg { width: 24px; height: 24px; }

    #polyglot-widget-panel {
      position: fixed;
      ${POSITION.includes("bottom") ? "bottom: 82px;" : "top: 82px;"}
      ${POSITION.includes("right") ? "right: 20px;" : "left: 20px;"}
      width: 340px;
      background: white;
      border-radius: 16px;
      border: 1px solid #E5E7EB;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
      z-index: 999999;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow: hidden;
      display: none;
      animation: polyglot-slide-up 0.25s ease-out;
    }
    #polyglot-widget-panel.open { display: block; }

    @keyframes polyglot-slide-up {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .polyglot-header {
      padding: 14px 16px;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .polyglot-header-title {
      font-size: 14px; font-weight: 700; color: #1F2937;
      display: flex; align-items: center; gap: 6px;
    }
    .polyglot-header-title span { color: #4F46E5; }
    .polyglot-close {
      background: none; border: none; cursor: pointer; color: #9CA3AF;
      font-size: 18px; padding: 2px 6px; border-radius: 6px;
    }
    .polyglot-close:hover { background: #F3F4F6; color: #1F2937; }

    .polyglot-body { padding: 16px; }

    .polyglot-select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      color: #1F2937;
      background: white;
      cursor: pointer;
      margin-bottom: 10px;
      -webkit-appearance: none;
      appearance: none;
    }
    .polyglot-select:focus {
      outline: none;
      border-color: #4F46E5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }

    .polyglot-textarea {
      width: 100%;
      height: 80px;
      padding: 10px 12px;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      font-size: 13px;
      color: #1F2937;
      resize: none;
      font-family: inherit;
      margin-bottom: 10px;
    }
    .polyglot-textarea:focus {
      outline: none;
      border-color: #4F46E5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }

    .polyglot-translate-btn {
      width: 100%;
      padding: 10px;
      background: #4F46E5;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .polyglot-translate-btn:hover { background: #4338CA; }
    .polyglot-translate-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .polyglot-result {
      margin-top: 12px;
      padding: 12px;
      background: #EEF2FF;
      border: 1px solid #C7D2FE;
      border-radius: 10px;
      display: none;
    }
    .polyglot-result.show { display: block; }
    .polyglot-result-label {
      font-size: 10px; font-weight: 700; color: #4F46E5;
      text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;
    }
    .polyglot-result-text { font-size: 13px; color: #1F2937; line-height: 1.5; }

    .polyglot-error {
      margin-top: 10px; padding: 10px; background: #FEF2F2;
      border: 1px solid #FECACA; border-radius: 10px;
      font-size: 12px; color: #DC2626; display: none;
    }
    .polyglot-error.show { display: block; }

    .polyglot-footer {
      padding: 8px 16px; border-top: 1px solid #E5E7EB;
      text-align: center;
    }
    .polyglot-footer a {
      font-size: 10px; color: #9CA3AF; text-decoration: none;
      font-weight: 500;
    }
    .polyglot-footer a:hover { color: #4F46E5; }
  `;
  document.head.appendChild(style);

  // Create floating button
  const btn = document.createElement("button");
  btn.id = "polyglot-widget-btn";
  btn.title = "Translate with PolyglotAI";
  btn.innerHTML = `<svg viewBox="0 0 256 256" fill="none"><path d="M239.15 212.42l-56-112a8 8 0 0 0-14.31 0l-21.71 43.43A88 88 0 0 1 100 126.93 103.65 103.65 0 0 0 127.7 64H152a8 8 0 0 0 0-16h-64V32a8 8 0 0 0-16 0v16H8a8 8 0 0 0 0 16h103.68A87.76 87.76 0 0 1 80 119.86a87.74 87.74 0 0 1-19.69-36.06 8 8 0 1 0-15.35 4.4 103.63 103.63 0 0 0 22.78 41.64A88.22 88.22 0 0 1 24 144a8 8 0 0 0 0 16 104.26 104.26 0 0 0 56-16.36 104.12 104.12 0 0 0 45.37 15.46l-24.52 49a8 8 0 0 0 14.31 7.16L128.84 188h70.32l13.68 27.37a8 8 0 0 0 14.31-7.16zM136.84 172L164 117.68 191.16 172z" fill="currentColor"/></svg>`;
  document.body.appendChild(btn);

  // Create panel
  const panel = document.createElement("div");
  panel.id = "polyglot-widget-panel";
  panel.innerHTML = `
    <div class="polyglot-header">
      <div class="polyglot-header-title">
        <span>Polyglot</span>AI Translator
      </div>
      <button class="polyglot-close" id="polyglot-close">&times;</button>
    </div>
    <div class="polyglot-body">
      <select class="polyglot-select" id="polyglot-target-lang">
        ${LANGUAGES.map(l => `<option value="${l.code}" ${l.code === DEFAULT_TARGET ? "selected" : ""}>${l.name}</option>`).join("")}
      </select>
      <textarea class="polyglot-textarea" id="polyglot-input" placeholder="Type or paste text to translate..."></textarea>
      <button class="polyglot-translate-btn" id="polyglot-go">Translate</button>
      <div class="polyglot-result" id="polyglot-result">
        <div class="polyglot-result-label">Translation</div>
        <div class="polyglot-result-text" id="polyglot-result-text"></div>
      </div>
      <div class="polyglot-error" id="polyglot-error"></div>
    </div>
    <div class="polyglot-footer">
      <a href="#" target="_blank">Powered by PolyglotAI</a>
    </div>
  `;
  document.body.appendChild(panel);

  // Toggle panel
  btn.addEventListener("click", () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) {
      const sel = window.getSelection().toString().trim();
      if (sel) document.getElementById("polyglot-input").value = sel;
    }
  });

  document.getElementById("polyglot-close").addEventListener("click", () => {
    panel.classList.remove("open");
  });

  // Translate
  document.getElementById("polyglot-go").addEventListener("click", async () => {
    const text = document.getElementById("polyglot-input").value.trim();
    const targetLang = document.getElementById("polyglot-target-lang").value;
    const resultEl = document.getElementById("polyglot-result");
    const resultText = document.getElementById("polyglot-result-text");
    const errorEl = document.getElementById("polyglot-error");
    const goBtn = document.getElementById("polyglot-go");

    if (!text) return;

    goBtn.disabled = true;
    goBtn.textContent = "Translating...";
    resultEl.classList.remove("show");
    errorEl.classList.remove("show");

    try {
      const res = await fetch(API_URL + "/widget/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": API_KEY },
        body: JSON.stringify({ text, source_language: "auto", target_language: targetLang })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Translation failed");
      }

      const data = await res.json();
      resultText.textContent = data.translated_text;
      resultEl.classList.add("show");
    } catch (e) {
      errorEl.textContent = e.message;
      errorEl.classList.add("show");
    } finally {
      goBtn.disabled = false;
      goBtn.textContent = "Translate";
    }
  });

  // Auto-translate selected text
  document.addEventListener("mouseup", () => {
    if (panel.classList.contains("open")) {
      const sel = window.getSelection().toString().trim();
      if (sel && sel.length > 1) {
        document.getElementById("polyglot-input").value = sel;
      }
    }
  });

  console.log("[PolyglotAI] Widget loaded successfully");
})();
