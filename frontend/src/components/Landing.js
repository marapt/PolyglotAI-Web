import { useState } from "react";
import {
  Translate, Microphone, PencilSimple, FileText, Code,
  WhatsappLogo, Phone, PuzzlePiece, ArrowRight, Globe,
  ChatCircleDots, HandPalm
} from "@phosphor-icons/react";

const CAPABILITIES = [
  {
    id: "translator",
    icon: Translate,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "Translator",
    subtitle: "100+ Languages",
    description: "Translate text instantly between 100+ languages with AI-powered accuracy. Support for sign language interpretation and text-to-sign conversion.",
    tab: "text",
    features: ["Text translation", "Sign language to text", "Text to sign language", "Translation history"],
  },
  {
    id: "voice",
    icon: Microphone,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    title: "Voice",
    subtitle: "Real-time",
    description: "Collaborate instantly with real-time voice translation in virtual meetings or in-person conversations. Speak in any language and hear the translation.",
    tab: "voice",
    features: ["Speech-to-text transcription", "Real-time voice translation", "Text-to-speech output", "Phone call translation via Twilio"],
  },
  {
    id: "messages",
    icon: ChatCircleDots,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    title: "Messages",
    subtitle: "WhatsApp & More",
    description: "Translate messages on WhatsApp, Airbnb, and any messaging platform. Send a message in any language and receive instant translations.",
    tab: "integrations",
    features: ["WhatsApp bot integration", "Works with any messaging app", "Auto language detection", "Conversation history"],
  },
  {
    id: "documents",
    icon: FileText,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    title: "Documents",
    subtitle: "Paste & Translate",
    description: "Translate documents, emails, and long-form content. Paste any text and get accurate translations preserving formatting and context.",
    tab: "text",
    features: ["Long text support", "Context-aware translation", "Copy results easily", "Batch translation"],
  },
  {
    id: "api",
    icon: Code,
    iconBg: "bg-gray-900",
    iconColor: "text-white",
    title: "API",
    subtitle: "Developer Tools",
    description: "Integrate AIpolyglots into your own applications. REST API, embeddable widget, Chrome extension, and webhook support for any platform.",
    tab: "integrations",
    features: ["REST API with key auth", "Embeddable JS widget", "Chrome extension", "Webhook endpoints"],
  },
];

export default function Landing({ onNavigate }) {
  const [expanded, setExpanded] = useState("voice");

  return (
    <div className="animate-fade-in" data-testid="landing-page">
      {/* Hero */}
      <div className="bg-white border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-5 py-12 md:py-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={18} weight="fill" className="text-[var(--primary)]" />
              <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest">aipolyglots.com</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4">
              Break every language barrier.{" "}
              <span className="text-[var(--primary)]">Everywhere.</span>
            </h2>
            <p className="text-base md:text-lg text-[var(--muted)] leading-relaxed mb-6">
              Translate text, voice, sign language, and messages across 100+ languages. 
              Integrate with WhatsApp, phone calls, websites, and any app through our API.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                data-testid="hero-try-translator-btn"
                onClick={() => onNavigate("text")}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm hover:bg-[var(--primary-hover)] transition-all shadow-md shadow-indigo-200"
              >
                <Translate size={18} weight="bold" /> Try Translator
              </button>
              <button
                data-testid="hero-view-api-btn"
                onClick={() => onNavigate("integrations")}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[var(--border)] bg-white text-[var(--foreground)] font-semibold text-sm hover:bg-[var(--primary-light)] transition-all"
              >
                <Code size={18} weight="bold" /> View API & Integrations
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-[var(--primary-light)] border-b border-indigo-100">
        <div className="max-w-5xl mx-auto px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          {[
            { label: "Languages", value: "100+" },
            { label: "Sign Languages", value: "8" },
            { label: "Integrations", value: "5+" },
            { label: "API Latency", value: "<2s" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-xl md:text-2xl font-extrabold text-[var(--primary)]">{s.value}</div>
              <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Capabilities Bento Grid */}
      <div className="max-w-5xl mx-auto px-5 py-10">
        <h3 className="text-xl font-bold mb-6">Capabilities</h3>
        <div className="flex gap-3 overflow-x-auto pb-4" data-testid="capabilities-grid">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            const isExpanded = expanded === cap.id;
            return (
              <div
                key={cap.id}
                data-testid={`capability-card-${cap.id}`}
                onClick={() => setExpanded(isExpanded ? null : cap.id)}
                className={`shrink-0 cursor-pointer rounded-2xl border border-[var(--border)] bg-[#EDF3FF] transition-all duration-300 overflow-hidden flex flex-col ${
                  isExpanded ? "w-80 md:w-96" : "w-28 md:w-32"
                }`}
                style={{ minHeight: "380px" }}
              >
                {/* Card Header */}
                <div className="p-4 flex flex-col items-start">
                  <div className={`w-10 h-10 rounded-lg ${cap.iconBg} flex items-center justify-center mb-3`}>
                    <Icon size={22} weight="bold" className={cap.iconColor} />
                  </div>
                  <h4 className="text-sm font-bold">{cap.title}</h4>
                  {!isExpanded && (
                    <span className="text-[10px] text-[var(--muted)] font-medium mt-0.5">{cap.subtitle}</span>
                  )}
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">{cap.subtitle}</span>
                      <button
                        data-testid={`capability-go-${cap.id}`}
                        onClick={(e) => { e.stopPropagation(); onNavigate(cap.tab); }}
                        className="ml-auto w-8 h-8 rounded-lg bg-[var(--foreground)] flex items-center justify-center text-white hover:bg-[var(--primary)] transition-colors"
                      >
                        <ArrowRight size={14} weight="bold" />
                      </button>
                    </div>
                    <p className="text-sm text-[var(--foreground)] leading-relaxed mb-4">{cap.description}</p>
                    <div className="mt-auto space-y-2">
                      {cap.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-[var(--muted)]">
                          <div className="w-1 h-1 rounded-full bg-[var(--primary)]" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Integration Highlights */}
      <div className="bg-white border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-5 py-10">
          <h3 className="text-xl font-bold mb-2">Works everywhere you communicate</h3>
          <p className="text-sm text-[var(--muted)] mb-6">Connect AIpolyglots to your favorite platforms and tools</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: WhatsappLogo, name: "WhatsApp", desc: "Bot translates messages", color: "text-green-600", bg: "bg-green-50" },
              { icon: Phone, name: "Phone Calls", desc: "Real-time call translation", color: "text-blue-600", bg: "bg-blue-50" },
              { icon: PuzzlePiece, name: "Chrome Extension", desc: "Translate any webpage", color: "text-purple-600", bg: "bg-purple-50" },
              { icon: Code, name: "REST API", desc: "Integrate in your app", color: "text-gray-700", bg: "bg-gray-100" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  data-testid={`integration-card-${item.name.toLowerCase().replace(/\s/g, '-')}`}
                  onClick={() => onNavigate("integrations")}
                  className={`${item.bg} rounded-2xl p-5 text-left hover:scale-[1.02] transition-transform border border-transparent hover:border-[var(--border)]`}
                >
                  <Icon size={28} weight="duotone" className={`${item.color} mb-3`} />
                  <div className="text-sm font-bold">{item.name}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
