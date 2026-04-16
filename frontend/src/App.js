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
  { id: "text", label: "TEXT", icon: Translate, component: TextTranslate },
  { id: "voice", label: "VOICE", icon: Microphone, component: VoiceTranslate },
  { id: "sign-to-text", label: "SIGN\u2192TEXT", icon: HandPalm, component: SignToText },
  { id: "text-to-sign", label: "TEXT\u2192SIGN", icon: TextAa, component: TextToSign },
  { id: "history", label: "HISTORY", icon: ClockCounterClockwise, component: History },
];

function App() {
  const [activeTab, setActiveTab] = useState("text");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component || TextTranslate;

  return (
    <div className="min-h-screen flex flex-col" data-testid="app-container">
      <header className="border-b border-black bg-white" data-testid="app-header">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Translate size={28} weight="bold" className="text-[var(--primary)]" />
            <h1 className="text-2xl tracking-tighter font-black uppercase">
              Polyglot<span className="text-[var(--primary)]">AI</span>
            </h1>
          </div>
          <span className="text-xs tracking-[0.2em] uppercase font-bold text-[var(--muted-foreground)] hidden sm:block">
            Universal Translator
          </span>
        </div>
      </header>

      <nav className="border-b border-black bg-white sticky top-0 z-50" data-testid="app-nav">
        <div className="max-w-6xl mx-auto flex overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-testid={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs tracking-[0.15em] font-bold uppercase border-r border-black transition-colors duration-100 whitespace-nowrap ${
                  isActive
                    ? "bg-[var(--foreground)] text-white"
                    : "bg-white text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-white"
                }`}
              >
                <Icon size={18} weight={isActive ? "fill" : "bold"} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="flex-1" data-testid="app-main">
        <div className="max-w-6xl mx-auto p-6">
          <ActiveComponent />
        </div>
      </main>

      <footer className="border-t border-black py-4 px-6" data-testid="app-footer">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs tracking-[0.1em] uppercase text-[var(--muted-foreground)]">
          <span>Polyglot AI &mdash; Powered by OpenAI</span>
          <span>100+ Languages &bull; Voice &bull; Sign Language</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
