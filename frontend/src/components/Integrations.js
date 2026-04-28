import { useState, useEffect } from "react";
import axios from "axios";
import {
  Code, Key, Copy, Check, WhatsappLogo, Phone,
  PuzzlePiece, ArrowRight, Play, Plus, ShieldCheck,
  Trash, Warning, Lock, Eye, EyeSlash
} from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BASE_URL = process.env.REACT_APP_BACKEND_URL;

const SECTIONS = [
  { id: "api", label: "REST API" },
  { id: "widget", label: "Widget" },
  { id: "extension", label: "Chrome Extension" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "phone", label: "Phone Calls" },
  { id: "security", label: "Security" },
];

function CodeBlock({ code }) {
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
  const [newKeyScope, setNewKeyScope] = useState("translate");
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(30);
  const [newKeyCap, setNewKeyCap] = useState(1000);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [showKey, setShowKey] = useState(false);
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
      const res = await axios.post(`${API}/keys/generate`, {
        name: newKeyName, scope: newKeyScope,
        rate_limit: newKeyRateLimit, daily_cap: newKeyCap
      });
      setGeneratedKey(res.data);
      setNewKeyName("");
      setShowKey(true);
      fetchKeys();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const revokeKey = async (keyId) => {
    try {
      await axios.delete(`${API}/keys/${keyId}`);
      fetchKeys();
    } catch (e) { console.error(e); }
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
      <p className="text-sm text-[var(--muted)] mb-5">Connect AIpolyglots to any platform or build your own translation tools</p>

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

      {/* ==================== REST API ==================== */}
      {activeSection === "api" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2"><Key size={18} weight="bold" className="text-[var(--primary)]" /> Generate API Key</h3>
            <p className="text-xs text-[var(--muted)] mb-4">Keys are hashed at rest. The full key is shown <strong>only once</strong> — copy it immediately.</p>

            <div className="space-y-3 mb-4">
              <input data-testid="api-key-name-input" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g., My App)" className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--primary)]" />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1 block">Scope</label>
                  <select data-testid="api-key-scope" value={newKeyScope} onChange={(e) => setNewKeyScope(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] text-xs font-medium focus:outline-none focus:border-[var(--primary)]">
                    <option value="read-only">Read Only</option>
                    <option value="translate">Translate</option>
                    <option value="full">Full Access</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1 block">Rate Limit/min</label>
                  <input type="number" data-testid="api-key-rate-limit" value={newKeyRateLimit} onChange={(e) => setNewKeyRateLimit(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] text-xs font-medium focus:outline-none focus:border-[var(--primary)]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1 block">Daily Cap</label>
                  <input type="number" data-testid="api-key-daily-cap" value={newKeyCap} onChange={(e) => setNewKeyCap(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] text-xs font-medium focus:outline-none focus:border-[var(--primary)]" />
                </div>
              </div>
              <button data-testid="generate-key-btn" onClick={generateKey} disabled={loading || !newKeyName.trim()}
                className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition-all disabled:opacity-40">
                <Plus size={14} weight="bold" /> Generate Key
              </button>
            </div>

            {/* Generated key — one-time display */}
            {generatedKey && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 mb-4" data-testid="generated-key-display">
                <div className="flex items-center gap-2 mb-2">
                  <Warning size={16} weight="fill" className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-700">Save this key now! It will not be shown again.</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-amber-900 break-all bg-amber-100 px-3 py-2 rounded-lg">
                    {showKey ? generatedKey.key : generatedKey.key.slice(0, 8) + "\u2022".repeat(20) + generatedKey.key.slice(-4)}
                  </code>
                  <button onClick={() => setShowKey(!showKey)} className="p-2 rounded-lg hover:bg-amber-100 text-amber-700">
                    {showKey ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(generatedKey.key); }} className="p-2 rounded-lg hover:bg-amber-100 text-amber-700" data-testid="copy-generated-key-btn">
                    <Copy size={16} />
                  </button>
                </div>
                <div className="flex gap-3 mt-2 text-[10px] text-amber-600 font-semibold">
                  <span>Scope: {generatedKey.scope}</span>
                  <span>Rate: {generatedKey.rate_limit}/min</span>
                  <span>Cap: {generatedKey.daily_cap}/day</span>
                </div>
              </div>
            )}

            {/* Key list — always masked */}
            {apiKeys.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Active Keys</h4>
                {apiKeys.map((k, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--bg)] text-xs">
                    <div className="flex items-center gap-2">
                      <Lock size={12} className="text-[var(--muted-light)]" />
                      <span className="font-semibold">{k.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[var(--muted-light)]" data-testid={`masked-key-${i}`}>{k.key_masked}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-[var(--primary)] font-bold">{k.scope}</span>
                      <span className="text-[var(--muted-light)]">{k.usage_count || 0} uses</span>
                      <button onClick={() => revokeKey(k.id)} className="p-1 rounded hover:bg-red-50 text-[var(--accent)]" data-testid={`revoke-key-${i}`}>
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Start — uses env vars */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2"><Code size={18} weight="bold" className="text-[var(--primary)]" /> Quick Start</h3>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4">
              <Warning size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium">Never hardcode API keys in source code. Always use environment variables. Leaked keys in public repos are scraped by bots within seconds.</p>
            </div>
            <CodeBlock code={`# Store your key in an environment variable
export AIPOLYGLOTS_API_KEY="pk_your_key_here"

curl -X POST ${BASE_URL}/api/v1/translate \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: $AIPOLYGLOTS_API_KEY" \\
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

          {/* Python example with env vars */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-3">Python Example</h3>
            <CodeBlock code={`import os
import requests

# Always load keys from environment variables
api_key = os.environ["AIPOLYGLOTS_API_KEY"]

response = requests.post(
    "${BASE_URL}/api/v1/translate",
    headers={"X-Api-Key": api_key},
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

      {/* ==================== WIDGET ==================== */}
      {activeSection === "widget" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-1">Embeddable Translation Widget</h3>
            <p className="text-xs text-[var(--muted)] mb-4">Add a floating translation widget to any website. Requires an API key.</p>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4">
              <Warning size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium">Widget API keys are visible in page source. Use a dedicated key with a low daily cap and "translate" scope only.</p>
            </div>
            <CodeBlock code={`<!-- Add this before </body> -->
<script>
  window.PolyglotConfig = {
    apiKey: "YOUR_API_KEY",
    apiUrl: "${BASE_URL}/api",
    position: "bottom-right",
    defaultTarget: "en"
  };
</script>
<script src="${BASE_URL}/widget.js"></script>`} />
          </div>
          <div className="bg-[var(--primary-light)] rounded-2xl p-5 border border-indigo-200">
            <h4 className="text-sm font-bold text-[var(--primary)] mb-2">How it works</h4>
            <ul className="space-y-1.5 text-xs text-[var(--foreground)]">
              <li>1. User selects text on your website</li>
              <li>2. A floating indigo button appears</li>
              <li>3. Click to open a translation panel with language selector</li>
              <li>4. Translation appears in the panel</li>
            </ul>
          </div>
        </div>
      )}

      {/* ==================== CHROME EXTENSION ==================== */}
      {activeSection === "extension" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <PuzzlePiece size={18} weight="bold" className="text-purple-600" /> Chrome Extension
            </h3>
            <p className="text-xs text-[var(--muted)] mb-4">Translate selected text on any webpage — WhatsApp Web, Airbnb, Gmail, and more</p>

            <a href="/polyglot-chrome-extension.zip" download
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition-all shadow-md shadow-purple-200 mb-4"
              data-testid="download-extension-btn">
              <ArrowRight size={16} weight="bold" style={{transform: 'rotate(90deg)'}} /> Download Chrome Extension (.zip)
            </a>

            <div className="bg-purple-50 rounded-xl p-4 mb-4">
              <h4 className="text-sm font-bold text-purple-700 mb-2">Setup Instructions</h4>
              <ol className="space-y-1.5 text-xs text-purple-900">
                <li>1. Download and unzip the extension file above</li>
                <li>2. Go to <code className="bg-purple-100 px-1 rounded">chrome://extensions</code> in Chrome</li>
                <li>3. Enable "Developer mode" (top right toggle)</li>
                <li>4. Click "Load unpacked" and select the unzipped folder</li>
                <li>5. Click the extension icon to configure your API URL and key</li>
                <li>6. Select any text on a webpage and click the "Translate" button</li>
              </ol>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <ShieldCheck size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium">Your API key is stored locally in Chrome's sync storage. It is never sent to any third party — only to your AIpolyglots API endpoint.</p>
            </div>
          </div>
        </div>
      )}

      {/* ==================== WHATSAPP ==================== */}
      {activeSection === "whatsapp" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <WhatsappLogo size={18} weight="fill" className="text-green-600" /> WhatsApp Translation Bot
            </h3>
            <p className="text-xs text-[var(--muted)] mb-4">Any developer can connect their Twilio account. No credentials needed on our end.</p>

            <div className="bg-green-50 rounded-xl p-4 mb-4">
              <h4 className="text-sm font-bold text-green-700 mb-2">How to set up</h4>
              <ol className="space-y-1.5 text-xs text-green-900">
                <li>1. Create a <a href="https://www.twilio.com/whatsapp" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Twilio account</a> with WhatsApp Sandbox</li>
                <li>2. Set your webhook URL to:</li>
              </ol>
              <CodeBlock code={`${BASE_URL}/api/webhooks/whatsapp`} />
              <ol start={3} className="space-y-1.5 text-xs text-green-900 mt-2">
                <li>3. Send a message to your Twilio WhatsApp number</li>
                <li>4. The bot auto-detects language and translates to English</li>
                <li>5. Use <code className="bg-green-100 px-1 rounded">/to es Hello world</code> to translate to Spanish</li>
              </ol>
            </div>

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

      {/* ==================== PHONE CALLS ==================== */}
      {activeSection === "phone" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <Phone size={18} weight="fill" className="text-blue-600" /> Real-time Phone Call Translation
            </h3>
            <p className="text-xs text-[var(--muted)] mb-4">Call a phone number, speak in any language, hear translation in real-time</p>

            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <h4 className="text-sm font-bold text-blue-700 mb-2">How to set up with Twilio Voice</h4>
              <ol className="space-y-1.5 text-xs text-blue-900">
                <li>1. Create a <a href="https://www.twilio.com/voice" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Twilio Voice</a> account and buy a phone number</li>
                <li>2. Configure the Voice webhook URL to:</li>
              </ol>
              <CodeBlock code={`${BASE_URL}/api/webhooks/voice`} />
              <ol start={3} className="space-y-1.5 text-xs text-blue-900 mt-2">
                <li>3. Call your Twilio number from any phone</li>
                <li>4. Speak in any language — translated and spoken back in English</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SECURITY ==================== */}
      {activeSection === "security" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <ShieldCheck size={18} weight="bold" className="text-green-600" /> Security & Privacy
            </h3>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                <h4 className="text-sm font-bold text-green-700 mb-2">Key Security</h4>
                <ul className="space-y-1.5 text-xs text-green-900">
                  <li className="flex items-start gap-2"><Check size={14} className="shrink-0 mt-0.5" /> <span>API keys are SHA-256 hashed at rest — raw keys are never stored in the database</span></li>
                  <li className="flex items-start gap-2"><Check size={14} className="shrink-0 mt-0.5" /> <span>Full key is shown <strong>only once</strong> at creation — subsequent views show masked values</span></li>
                  <li className="flex items-start gap-2"><Check size={14} className="shrink-0 mt-0.5" /> <span>Keys can be revoked instantly via the API or UI</span></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <h4 className="text-sm font-bold text-blue-700 mb-2">Rate Limiting & Usage Caps</h4>
                <ul className="space-y-1.5 text-xs text-blue-900">
                  <li className="flex items-start gap-2"><Check size={14} className="shrink-0 mt-0.5" /> <span>Per-key rate limiting (configurable, default: 30 requests/minute)</span></li>
                  <li className="flex items-start gap-2"><Check size={14} className="shrink-0 mt-0.5" /> <span>Daily usage caps (configurable, default: 1,000 requests/day)</span></li>
                  <li className="flex items-start gap-2"><Check size={14} className="shrink-0 mt-0.5" /> <span>HTTP 429 returned when limits are exceeded, with Retry-After header</span></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                <h4 className="text-sm font-bold text-purple-700 mb-2">Scoped Permissions</h4>
                <ul className="space-y-1.5 text-xs text-purple-900">
                  <li className="flex items-start gap-2"><Lock size={14} className="shrink-0 mt-0.5" /> <span><strong>read-only</strong> — Can only query supported languages and history</span></li>
                  <li className="flex items-start gap-2"><Lock size={14} className="shrink-0 mt-0.5" /> <span><strong>translate</strong> — Can translate text (default, recommended for widgets/extensions)</span></li>
                  <li className="flex items-start gap-2"><Lock size={14} className="shrink-0 mt-0.5" /> <span><strong>full</strong> — Full access to all API endpoints</span></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <h4 className="text-sm font-bold text-amber-700 mb-2">Data Privacy</h4>
                <ul className="space-y-1.5 text-xs text-amber-900">
                  <li className="flex items-start gap-2"><ShieldCheck size={14} className="shrink-0 mt-0.5" /> <span>All API traffic is encrypted via HTTPS/TLS</span></li>
                  <li className="flex items-start gap-2"><ShieldCheck size={14} className="shrink-0 mt-0.5" /> <span>Public API calls (/v1/translate) do <strong>not</strong> log the translated text — only metadata (language pairs, timestamps)</span></li>
                  <li className="flex items-start gap-2"><ShieldCheck size={14} className="shrink-0 mt-0.5" /> <span>Translation requests are processed by OpenAI's API — review <a href="https://openai.com/policies/api-data-usage-policies" target="_blank" rel="noopener noreferrer" className="underline">OpenAI's data usage policy</a></span></li>
                  <li className="flex items-start gap-2"><Warning size={14} className="shrink-0 mt-0.5" /> <span>Do not send PII or sensitive data through translation APIs without proper data handling agreements</span></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <h4 className="text-sm font-bold text-gray-700 mb-2">Best Practices</h4>
                <ul className="space-y-1.5 text-xs text-gray-700">
                  <li>1. Store API keys in environment variables, never in source code</li>
                  <li>2. Use the minimum required scope for each key</li>
                  <li>3. Set appropriate rate limits and daily caps</li>
                  <li>4. Rotate keys regularly and revoke unused ones</li>
                  <li>5. For client-side usage (widgets), use a dedicated key with low caps</li>
                  <li>6. Monitor usage counts in the key list to detect anomalies</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
