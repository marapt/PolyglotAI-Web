import { useState, useEffect } from "react";
import axios from "axios";
import { ClockCounterClockwise, ArrowDown, ArrowsClockwise } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/history`);
      setHistory(res.data.history || []);
    } catch (e) {
      console.error("History fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="animate-fade-in-up" data-testid="history-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl tracking-tighter font-black">Translation History</h2>
        <button
          data-testid="history-refresh-btn"
          onClick={fetchHistory}
          className="flex items-center gap-1 px-3 py-2 border border-black text-sm font-bold uppercase tracking-wider hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] transition-colors duration-100"
        >
          <ArrowsClockwise size={16} weight="bold" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16" data-testid="history-loading">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-black" data-testid="history-empty">
          <ClockCounterClockwise size={64} weight="thin" className="text-[var(--secondary)] mb-4" />
          <p className="text-lg font-bold text-[var(--muted-foreground)]">No translation history yet</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Your translations will appear here</p>
        </div>
      ) : (
        <div className="space-y-0 border border-black">
          {history.map((item, i) => (
            <div
              key={item.id || i}
              data-testid={`history-item-${i}`}
              className="border-b border-black p-6 hover:bg-[var(--muted)] transition-colors duration-100 stagger-item"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs tracking-[0.2em] uppercase font-bold text-[var(--primary)]">
                  {item.source_language} &rarr; {item.target_language}
                </span>
                <span className="text-xs text-[var(--muted-foreground)] font-mono">{formatDate(item.timestamp)}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs tracking-[0.15em] uppercase font-bold text-[var(--muted-foreground)] mb-1 block">Original</label>
                  <p className="font-mono text-sm">{item.original_text}</p>
                </div>
                <div>
                  <label className="text-xs tracking-[0.15em] uppercase font-bold text-[var(--muted-foreground)] mb-1 block">Translation</label>
                  <p className="font-mono text-sm">{item.translated_text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
