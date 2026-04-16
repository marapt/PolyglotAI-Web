import { useState } from "react";
import "@/App.css";
import TextTranslate from "@/components/TextTranslate";
import VoiceTranslate from "@/components/VoiceTranslate";
import SignToText from "@/components/SignToText";
import TextToSign from "@/components/TextToSign";
import History from "@/components/History";
import {
  Translate,
  Microphone,
  HandPalm,
  TextAa,
  ClockCounterClockwise,
} from "@phosphor-icons/react";

const TABS = [
  { id: "text", label: "Text", icon: Translate, component: TextTranslate },
  { id: "voice", label: "Voice", icon: Microphone, component: VoiceTranslate },
  { id: "sign-to-text", label: "Sign\u2192Text", icon: HandPalm, component: SignToText },
  { id: "text-to-sign", label: "Text\u2192Sign", icon: TextAa, component: TextToSign },
  { id: "history", label: "History", icon: ClockCounterClockwise, component: History },
];

function App() {
  const [activeTab, setActiveTab] = useState("text");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component || TextTranslate;

  return (
    <div className="min-h-screen flex flex-col" data-testid="app-container">
      {/* Header */}
      <header className="bg-white border-b border-[var(--border)] sticky top-0 z-50" data-testid="app-header">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center">
              <Translate size={20} weight="bold" className="text-white" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Polyglot<span className="text-[var(--primary)]">AI</span>
            </h1>
          </div>
          <span className="text-xs font-semibold text-[var(--muted-light)] tracking-wide hidden sm:block">
            Universal Translator
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24" data-testid="app-main">
        <div className="max-w-3xl mx-auto px-5 py-6">
          <ActiveComponent />
        </div>
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] z-50" data-testid="app-nav">
        <div className="max-w-3xl mx-auto flex">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-testid={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors duration-200 ${
                  isActive
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-light)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon size={22} weight={isActive ? "fill" : "regular"} />
                <span className={`text-[10px] font-semibold ${isActive ? "font-bold" : ""}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;
