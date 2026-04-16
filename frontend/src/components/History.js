import { useState, useEffect } from "react";
import axios from "axios";
import { ClockCounterClockwise, ArrowsClockwise, Translate } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/history`);
      setHistory(res.data.history || []);
    } catch (e) { console.error("History fetch failed", e); }
    finally { setLoading(false); }
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ", " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="animate-fade-in" data-testid="history-page">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold">History</h2>
        <button data-testid="history-refresh-btn" onClick={fetchHistory}
          className="p-2 rounded-lg text-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors">
          <ArrowsClockwise size={20} weight="bold" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20" data-testid="history-loading">
          <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[var(--border)] shadow-sm" data-testid="history-empty">
          <ClockCounterClockwise size={56} weight="thin" className="text-[var(--border)] mb-4" />
          <p className="text-base font-semibold text-[var(--muted)]">No translation history yet</p>
          <p className="text-sm text-[var(--muted-light)] mt-1">Your translations will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item, i) => (
            <div
              key={item.id || i}
              data-testid={`history-item-${i}`}
              className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm hover:shadow-md transition-shadow duration-200 stagger-item"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Translate size={16} weight="bold" className="text-[var(--primary)]" />
                  <span className="text-xs font-bold text-[var(--primary)] tracking-wide">
                    {item.source_language} &rarr; {item.target_language}
                  </span>
                </div>
                <span className="text-xs text-[var(--muted-light)]">{formatDate(item.timestamp)}</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-semibold text-[var(--muted-light)] uppercase tracking-wider">Original</label>
                  <p className="text-sm mt-0.5 leading-relaxed">{item.original_text}</p>
                </div>
                <div className="border-t border-[var(--border-light)] pt-2">
                  <label className="text-[10px] font-semibold text-[var(--muted-light)] uppercase tracking-wider">Translation</label>
                  <p className="text-sm mt-0.5 leading-relaxed">{item.translated_text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
