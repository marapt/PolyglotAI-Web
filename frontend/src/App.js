import { useState } from "react";
import "@/App.css";
import Landing from "@/components/Landing";
import TextTranslate from "@/components/TextTranslate";
import VoiceTranslate from "@/components/VoiceTranslate";
import SignToText from "@/components/SignToText";
import TextToSign from "@/components/TextToSign";
import History from "@/components/History";
import Integrations from "@/components/Integrations";
import {
  Translate,
  Microphone,
  HandPalm,
  TextAa,
  ClockCounterClockwise,
  PlugsConnected,
  House,
} from "@phosphor-icons/react";

const TABS = [
  { id: "home", label: "Home", icon: House, component: Landing },
  { id: "text", label: "Text", icon: Translate, component: TextTranslate },
  { id: "voice", label: "Voice", icon: Microphone, component: VoiceTranslate },
  { id: "sign-to-text", label: "Sign\u2192Text", icon: HandPalm, component: SignToText },
  { id: "text-to-sign", label: "Text\u2192Sign", icon: TextAa, component: TextToSign },
  { id: "integrations", label: "API", icon: PlugsConnected, component: Integrations },
  { id: "history", label: "History", icon: ClockCounterClockwise, component: History },
];

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component || Landing;

  return (
    <div className="min-h-screen flex flex-col" data-testid="app-container">
      <header className="bg-white border-b border-[var(--border)] sticky top-0 z-50" data-testid="app-header">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <button onClick={() => setActiveTab("home")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity" data-testid="logo-btn">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center">
              <Translate size={20} weight="bold" className="text-white" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">
              AI<span className="text-[var(--primary)]">polyglots</span>
            </h1>
          </button>
          <span className="text-xs font-semibold text-[var(--muted-light)] tracking-wide hidden sm:block">
            aipolyglots.com
          </span>
        </div>
      </header>

      <main className="flex-1 pb-20" data-testid="app-main">
        <div className={activeTab === "home" ? "" : "max-w-3xl mx-auto px-5 py-6"}>
          <ActiveComponent onNavigate={setActiveTab} />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] z-50" data-testid="app-nav">
        <div className="max-w-5xl mx-auto flex">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-testid={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors duration-200 ${
                  isActive ? "text-[var(--primary)]" : "text-[var(--muted-light)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon size={20} weight={isActive ? "fill" : "regular"} />
                <span className={`text-[10px] font-semibold ${isActive ? "font-bold" : ""}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;
