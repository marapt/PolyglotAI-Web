// AIpolyglots Chrome Extension - Content Script
// Detects text selection and shows inline translation popup

(function () {
  "use strict";

  let currentPopup = null;
  let API_URL = "";
  let API_KEY = "";
  let TARGET_LANG = "en";

  // Load settings from storage
  chrome.storage.sync.get(["apiUrl", "apiKey", "targetLang"], (data) => {
    API_URL = data.apiUrl || "";
    API_KEY = data.apiKey || "";
    TARGET_LANG = data.targetLang || "en";
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.apiUrl) API_URL = changes.apiUrl.newValue || "";
    if (changes.apiKey) API_KEY = changes.apiKey.newValue || "";
    if (changes.targetLang) TARGET_LANG = changes.targetLang.newValue || "en";
  });

  function removePopup() {
    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }
  }

  function createPopup(x, y, content, isLoading = false) {
    removePopup();

    const popup = document.createElement("div");
    popup.id = "polyglot-ext-popup";
    popup.className = "polyglot-ext-popup";

    if (isLoading) {
      popup.innerHTML = `
        <div class="polyglot-ext-header">
          <span class="polyglot-ext-brand"><strong>AI</strong>polyglots</span>
        </div>
        <div class="polyglot-ext-body">
          <div class="polyglot-ext-loading">
            <div class="polyglot-ext-spinner"></div>
            <span>Translating...</span>
          </div>
        </div>
      `;
    } else {
      popup.innerHTML = `
        <div class="polyglot-ext-header">
          <span class="polyglot-ext-brand"><strong>AI</strong>polyglots</span>
          <button class="polyglot-ext-close" id="polyglot-ext-close">&times;</button>
        </div>
        <div class="polyglot-ext-body">
          <div class="polyglot-ext-text">${content}</div>
        </div>
      `;
    }

    // Position
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    let left = x + 10;
    let top = y + 10;
    if (left + 320 > viewW) left = viewW - 330;
    if (top + 150 > viewH) top = y - 120;
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    popup.style.left = left + "px";
    popup.style.top = top + "px";

    document.body.appendChild(popup);
    currentPopup = popup;

    const closeBtn = popup.querySelector("#polyglot-ext-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", removePopup);
    }

    return popup;
  }

  async function translateText(text, x, y) {
    if (!API_URL || !API_KEY) {
      createPopup(x, y, '<span class="polyglot-ext-error">Please configure your API key in the extension popup.</span>');
      return;
    }

    createPopup(x, y, "", true);

    try {
      const res = await fetch(API_URL + "/v1/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": API_KEY,
        },
        body: JSON.stringify({
          text: text,
          source_language: "auto",
          target_language: TARGET_LANG,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Translation failed");
      }

      const data = await res.json();
      createPopup(x, y, data.translated_text);
    } catch (e) {
      createPopup(x, y, `<span class="polyglot-ext-error">${e.message}</span>`);
    }
  }

  // Show translate button on text selection
  let translateBtn = null;

  function removeTranslateBtn() {
    if (translateBtn) {
      translateBtn.remove();
      translateBtn = null;
    }
  }

  document.addEventListener("mouseup", (e) => {
    // Ignore clicks inside our own UI
    if (e.target.closest("#polyglot-ext-popup") || e.target.closest("#polyglot-ext-translate-btn")) return;

    removeTranslateBtn();

    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (!text || text.length < 2) return;

    translateBtn = document.createElement("button");
    translateBtn.id = "polyglot-ext-translate-btn";
    translateBtn.className = "polyglot-ext-translate-btn";
    translateBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M239.15 212.42l-56-112a8 8 0 0 0-14.31 0l-21.71 43.43A88 88 0 0 1 100 126.93 103.65 103.65 0 0 0 127.7 64H152a8 8 0 0 0 0-16h-64V32a8 8 0 0 0-16 0v16H8a8 8 0 0 0 0 16h103.68A87.76 87.76 0 0 1 80 119.86a87.74 87.74 0 0 1-19.69-36.06 8 8 0 1 0-15.35 4.4 103.63 103.63 0 0 0 22.78 41.64A88.22 88.22 0 0 1 24 144a8 8 0 0 0 0 16 104.26 104.26 0 0 0 56-16.36 104.12 104.12 0 0 0 45.37 15.46l-24.52 49a8 8 0 0 0 14.31 7.16L128.84 188h70.32l13.68 27.37a8 8 0 0 0 14.31-7.16zM136.84 172L164 117.68 191.16 172z"/></svg> Translate`;
    translateBtn.style.left = e.clientX + "px";
    translateBtn.style.top = (e.clientY - 40) + "px";

    document.body.appendChild(translateBtn);

    translateBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      removeTranslateBtn();
      translateText(text, e.clientX, e.clientY);
    });
  });

  document.addEventListener("mousedown", (e) => {
    if (!e.target.closest("#polyglot-ext-popup") && !e.target.closest("#polyglot-ext-translate-btn")) {
      removePopup();
      removeTranslateBtn();
    }
  });
})();
