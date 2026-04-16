import { useState, useEffect } from "react";
import axios from "axios";
import {
  Code, Key, Copy, Check, WhatsappLogo, Phone,
  PuzzlePiece, ArrowRight, Play, Plus
} from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BASE_URL = process.env.REACT_APP_BACKEND_URL;

const SECTIONS = [
  { id: "api", label: "REST API" },
  { id: "widget", label: "Widget" },
  { id: "extension", label: "Chrome Extension" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "phone", label: "Phone Calls" },
];

function CodeBlock({ code, language = "bash" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-xl bg-gray-900 text-gray-100 p-4 text-sm font-mono overflow-x-auto">
      <button onClick={handleCopy} className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors" data-testid="copy-code-btn">
        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>
      <pre className="whitespace-pre-wrap">{code}</pre>
    </div>
  );
}

export default function Integrations() {
  const [activeSection, setActiveSection] = useState("api");
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => { fetchKeys(); }, []);

  const fetchKeys = async () => {
    try {
      const res = await axios.get(`${API}/keys`);
      setApiKeys(res.data.keys || []);
    } catch (e) { console.error(e); }
  };

  const generateKey = async () => {
    if (!newKeyName.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/keys/generate`, { name: newKeyName });
      setGeneratedKey(res.data);
      setNewKeyName("");
      fetchKeys();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const testApiCall = async () => {
    if (!generatedKey) return;
    setTestResult(null);
    try {
      const res = await axios.post(`${API}/v1/translate`,
        { text: "Hello, world!", source_language: "en", target_language: "es" },
        { headers: { "X-Api-Key": generatedKey.key } }
      );
      setTestResult(res.data);
    } catch (e) {
      setTestResult({ error: e.response?.data?.detail || "API call failed" });
    }
  };

  return (
    <div className="animate-fade-in" data-testid="integrations-page">
      <h2 className="text-xl font-bold mb-2">API & Integrations</h2>
      <p className="text-sm text-[var(--muted)] mb-5">Connect Polyglot AI to any platform or build your own translation tools</p>

      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto mb-6 pb-1">
        {SECTIONS.map((s) => (
          <button key={s.id} data-testid={`section-tab-${s.id}`} onClick={() => setActiveSection(s.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeSection === s.id
                ? "bg-[var(--primary)] text-white shadow-md shadow-indigo-200"
                : "bg-white border border-[var(--border)] hover:bg-[var(--primary-light)]"
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* REST API Section */}
      {activeSection === "api" && (
        <div className="space-y-5">
          {/* Key Generation */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2"><Key size={18} weight="bold" className="text-[var(--primary)]" /> API Keys</h3>
            <p className="text-xs text-[var(--muted)] mb-4">Generate an API key to authenticate your requests</p>

            <div className="flex gap-2 mb-4">
              <input data-testid="api-key-name-input" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g., My App)" className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)]" />
              <button data-testid="generate-key-btn" onClick={generateKey} disabled={loading || !newKeyName.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-all disabled:opacity-40">
                <Plus size={14} weight="bold" /> Generate
              </button>
            </div>

            {generatedKey && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 mb-4" data-testid="generated-key-display">
                <p className="text-xs font-bold text-green-700 mb-1">Key generated! Save it now — it won't be shown again.</p>
                <code className="text-sm font-mono text-green-900 break-all">{generatedKey.key}</code>
              </div>
            )}

            {apiKeys.length > 0 && (
              <div className="space-y-2">
                {apiKeys.map((k, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg)] text-xs">
                    <span className="font-semibold">{k.name}</span>
                    <span className="font-mono text-[var(--muted)]">{k.key}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* API Usage */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-3 flex items-center gap-2"><Code size={18} weight="bold" className="text-[var(--primary)]" /> Quick Start</h3>
            <CodeBlock code={`curl -X POST ${BASE_URL}/api/v1/translate \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{
    "text": "Hello, how are you?",
    "source_language": "en",
    "target_language": "es"
  }'`} />
            <p className="text-xs text-[var(--muted)] mt-3 mb-3">Response:</p>
            <CodeBlock code={`{
  "translated_text": "Hola, como estas?",
  "source_language": "en",
  "target_language": "es"
}`} />

            {generatedKey && (
              <button data-testid="test-api-btn" onClick={testApiCall}
                className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-all">
                <Play size={14} weight="fill" /> Test API Call
              </button>
            )}
            {testResult && (
              <div className="mt-3 p-3 rounded-xl bg-[var(--primary-light)] text-sm font-mono" data-testid="api-test-result">
                {JSON.stringify(testResult, null, 2)}
              </div>
            )}
          </div>

          {/* Python example */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-3">Python Example</h3>
            <CodeBlock code={`import requests

response = requests.post(
    "${BASE_URL}/api/v1/translate",
    headers={"X-Api-Key": "YOUR_API_KEY"},
    json={
        "text": "Good morning!",
        "source_language": "en",
        "target_language": "ja"
    }
)
print(response.json()["translated_text"])
# Output: おはようございます！`} />
          </div>
        </div>
      )}

      {/* Widget Section */}
      {activeSection === "widget" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-1">Embeddable Translation Widget</h3>
            <p className="text-xs text-[var(--muted)] mb-4">Add a translation widget to any website with a single script tag</p>
            <CodeBlock code={`<!-- Add this to your HTML -->
<script>
  window.PolyglotConfig = {
    apiKey: "YOUR_API_KEY",
    apiUrl: "${BASE_URL}/api",
    position: "bottom-right",
    defaultTarget: "en"
  };
</script>
<script src="${BASE_URL}/widget.js"></script>`} />
            <p className="text-xs text-[var(--muted)] mt-4">The widget adds a floating translation button. Users can select text, choose a language, and get instant translations.</p>
          </div>
          <div className="bg-[var(--primary-light)] rounded-2xl p-5 border border-indigo-200">
            <h4 className="text-sm font-bold text-[var(--primary)] mb-2">How it works</h4>
            <ul className="space-y-1.5 text-xs text-[var(--foreground)]">
              <li>1. User selects text on your website</li>
              <li>2. A translate button appears near the selection</li>
              <li>3. Click to translate into the configured target language</li>
              <li>4. Translation appears in a tooltip overlay</li>
            </ul>
          </div>
        </div>
      )}

      {/* Chrome Extension Section */}
      {activeSection === "extension" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <PuzzlePiece size={18} weight="bold" className="text-purple-600" /> Chrome Extension
            </h3>
            <p className="text-xs text-[var(--muted)] mb-4">Translate selected text on any webpage — WhatsApp Web, Airbnb, Gmail, and more</p>

            <div className="bg-purple-50 rounded-xl p-4 mb-4">
              <h4 className="text-sm font-bold text-purple-700 mb-2">Setup Instructions</h4>
              <ol className="space-y-1.5 text-xs text-purple-900">
                <li>1. Create a folder called <code className="bg-purple-100 px-1 rounded">polyglot-extension</code></li>
                <li>2. Add the manifest.json and content.js files below</li>
                <li>3. Go to <code className="bg-purple-100 px-1 rounded">chrome://extensions</code></li>
                <li>4. Enable "Developer mode" (top right toggle)</li>
                <li>5. Click "Load unpacked" and select your folder</li>
                <li>6. Select any text on a webpage and click "Translate"</li>
              </ol>
            </div>

            <h4 className="text-sm font-bold mb-2">manifest.json</h4>
            <CodeBlock code={`{
  "manifest_version": 3,
  "name": "Polyglot AI Translator",
  "version": "1.0",
  "description": "Translate selected text on any webpage",
  "permissions": ["contextMenus", "storage"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["styles.css"]
  }],
  "icons": { "48": "icon.png" }
}`} />

            <h4 className="text-sm font-bold mb-2 mt-4">content.js</h4>
            <CodeBlock code={`const API_URL = "${BASE_URL}/api/v1/translate";
const API_KEY = "YOUR_API_KEY"; // Replace with your key

document.addEventListener("mouseup", async (e) => {
  const text = window.getSelection().toString().trim();
  if (!text || text.length < 2) return;
  
  // Remove existing popup
  document.getElementById("polyglot-popup")?.remove();
  
  const popup = document.createElement("div");
  popup.id = "polyglot-popup";
  popup.style.cssText = \`
    position:fixed; top:\${e.clientY+10}px; left:\${e.clientX}px;
    background:white; border:1px solid #E5E7EB; border-radius:12px;
    padding:12px 16px; box-shadow:0 8px 30px rgba(0,0,0,0.12);
    z-index:999999; max-width:320px; font-family:sans-serif;
  \`;
  popup.innerHTML = '<div style="font-size:12px;color:#6B7280;">Translating...</div>';
  document.body.appendChild(popup);
  
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": API_KEY },
      body: JSON.stringify({ text, source_language: "auto", target_language: "en" })
    });
    const data = await res.json();
    popup.innerHTML = \`
      <div style="font-size:11px;color:#4F46E5;font-weight:700;margin-bottom:4px;">
        POLYGLOT AI
      </div>
      <div style="font-size:14px;color:#1F2937;">\${data.translated_text}</div>
    \`;
  } catch { popup.innerHTML = '<div style="color:red;font-size:12px;">Translation failed</div>'; }
  
  setTimeout(() => popup.remove(), 8000);
});

document.addEventListener("mousedown", (e) => {
  if (!e.target.closest("#polyglot-popup")) {
    document.getElementById("polyglot-popup")?.remove();
  }
});`} />
          </div>
        </div>
      )}

      {/* WhatsApp Section */}
      {activeSection === "whatsapp" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <WhatsappLogo size={18} weight="fill" className="text-green-600" /> WhatsApp Translation Bot
            </h3>
            <p className="text-xs text-[var(--muted)] mb-4">Send any message in any language to your WhatsApp bot and get instant translations</p>

            <div className="bg-green-50 rounded-xl p-4 mb-4">
              <h4 className="text-sm font-bold text-green-700 mb-2">How to set up</h4>
              <ol className="space-y-1.5 text-xs text-green-900">
                <li>1. Create a <a href="https://www.twilio.com/whatsapp" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Twilio account</a> with WhatsApp Sandbox</li>
                <li>2. In Twilio Console, set your webhook URL to:</li>
              </ol>
              <CodeBlock code={`${BASE_URL}/api/webhooks/whatsapp`} />
              <ol start={3} className="space-y-1.5 text-xs text-green-900 mt-2">
                <li>3. Send a message to your Twilio WhatsApp number</li>
                <li>4. The bot auto-detects the language and translates to English</li>
                <li>5. Use <code className="bg-green-100 px-1 rounded">/to es Hello world</code> to translate to Spanish</li>
              </ol>
            </div>

            <h4 className="text-sm font-bold mb-2">Usage Examples</h4>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-[var(--bg)] text-sm">
                <span className="font-semibold">You:</span> Bonjour, comment allez-vous?<br />
                <span className="font-semibold text-[var(--primary)]">Bot:</span> Hello, how are you?
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg)] text-sm">
                <span className="font-semibold">You:</span> /to ja Good morning!<br />
                <span className="font-semibold text-[var(--primary)]">Bot:</span> おはようございます！
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone Calls Section */}
      {activeSection === "phone" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <Phone size={18} weight="fill" className="text-blue-600" /> Real-time Phone Call Translation
            </h3>
            <p className="text-xs text-[var(--muted)] mb-4">Call a phone number, speak in any language, and hear the translation in real-time</p>

            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <h4 className="text-sm font-bold text-blue-700 mb-2">How to set up with Twilio Voice</h4>
              <ol className="space-y-1.5 text-xs text-blue-900">
                <li>1. Create a <a href="https://www.twilio.com/voice" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Twilio Voice</a> account and buy a phone number</li>
                <li>2. In Twilio Console, configure the Voice webhook URL to:</li>
              </ol>
              <CodeBlock code={`${BASE_URL}/api/webhooks/voice`} />
              <ol start={3} className="space-y-1.5 text-xs text-blue-900 mt-2">
                <li>3. Call your Twilio number from any phone</li>
                <li>4. Speak in any language — the system will translate and read back in English</li>
                <li>5. The conversation continues with back-and-forth translation</li>
              </ol>
            </div>

            <h4 className="text-sm font-bold mb-2">How it works</h4>
            <div className="space-y-2 text-sm text-[var(--muted)]">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                <span>You call the Twilio number and hear a welcome message</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                <span>Speak in any language — your speech is transcribed by AI</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                <span>The transcription is translated to English (or target language)</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</div>
                <span>The translation is spoken back to you via text-to-speech</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
