// PolyglotAI Chrome Extension - Popup Script
document.addEventListener("DOMContentLoaded", () => {
  const apiUrlInput = document.getElementById("apiUrl");
  const apiKeyInput = document.getElementById("apiKey");
  const targetLangSelect = document.getElementById("targetLang");
  const saveBtn = document.getElementById("save");
  const statusEl = document.getElementById("status");

  // Load saved settings
  chrome.storage.sync.get(["apiUrl", "apiKey", "targetLang"], (data) => {
    if (data.apiUrl) apiUrlInput.value = data.apiUrl;
    if (data.apiKey) apiKeyInput.value = data.apiKey;
    if (data.targetLang) targetLangSelect.value = data.targetLang;
  });

  saveBtn.addEventListener("click", () => {
    const apiUrl = apiUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    const targetLang = targetLangSelect.value;

    if (!apiUrl || !apiKey) {
      statusEl.className = "status error";
      statusEl.textContent = "Please fill in API URL and API Key";
      return;
    }

    chrome.storage.sync.set({ apiUrl, apiKey, targetLang }, () => {
      statusEl.className = "status success";
      statusEl.textContent = "Settings saved! Select text on any page to translate.";
      setTimeout(() => { statusEl.className = "status"; }, 3000);
    });
  });
});
