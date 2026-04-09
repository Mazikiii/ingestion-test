"use client";

import { useEffect, useState } from "react";
import api, { formatNaira, formatDate } from "@/lib/api";

type TrendData = {
  range: string;
  period_start: string;
  period_end: string;
  total_spent_kobo: string;
  comparison_total_spent_kobo: string | null;
  change_percentage: number | null;
  available_ranges: string[];
  bars: { key: string; label: string; amount_kobo: string }[];
};

type Transaction = {
  id: string;
  amount_kobo: string;
  description: string;
  transacted_at: string;
  status: string;
};

export default function ActivitiesPage() {
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"week" | "cycle">("week");
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  useEffect(() => {
    loadTrend();
    loadTransactions();
  }, [range]);

  const loadTrend = async () => {
    try {
      const res = await api.get(`/transactions/trend?range=${range}`);
      if (res.ok) {
        setTrend(await res.json());
      }
    } catch (e) {
      // Silent fail
    }
  };

  const loadTransactions = async (cursorParam?: string) => {
    try {
      const url = cursorParam 
        ? `/transactions?limit=20&cursor=${encodeURIComponent(cursorParam)}`
        : "/transactions?limit=20";
      const res = await api.get(url);
      if (res.ok) {
        const data = await res.json();
        if (cursorParam) {
          setTransactions(prev => [...prev, ...(data.transactions || [])]);
        } else {
          setTransactions(data.transactions || []);
        }
        setCursor(data.next_cursor || null);
      }
    } catch (e) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (cursor) loadTransactions(cursor);
  };

  const maxAmount = trend?.bars.reduce((max, bar) => {
    const amt = parseInt(bar.amount_kobo, 10);
    return amt > max ? amt : max;
  }, 0) || 1;

  if (loading) {
    return (
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1 className="logo">Activities</h1>
      </header>

      <div className="section">
        <div className="range-toggle">
          {trend?.available_ranges?.includes("week") && (
            <button
              className={`toggle-btn ${range === "week" ? "active" : ""}`}
              onClick={() => setRange("week")}
            >
              Week
            </button>
          )}
          {trend?.available_ranges?.includes("cycle") && (
            <button
              className={`toggle-btn ${range === "cycle" ? "active" : ""}`}
              onClick={() => setRange("cycle")}
            >
              Cycle
            </button>
          )}
        </div>

        {trend && (
          <div className="chart-card card">
            <div className="chart-summary">
              <span className="chart-total">
                {formatNaira(trend.total_spent_kobo)}
              </span>
              {trend.change_percentage !== null && (
                <span className={`chart-change ${trend.change_percentage > 0 ? "up" : "down"}`}>
                  {trend.change_percentage > 0 ? "+" : ""}{trend.change_percentage}% vs last {range === "week" ? "week" : "cycle"}
                </span>
              )}
            </div>

            <div className="chart-bars">
              {trend.bars.map((bar) => (
                <div key={bar.key} className="bar-container">
                  <div 
                    className="bar" 
                    style={{ height: `${(parseInt(bar.amount_kobo, 10) / maxAmount) * 100}%` }}
                  />
                  <span className="bar-label">{bar.label}</span>
                </div>
              ))}
            </div>

            <p className="chart-period">
              {trend.period_start} - {trend.period_end}
            </p>
          </div>
        )}
      </div>

      <div className="section">
        <h3 className="section-title">Transactions</h3>
        {transactions.length === 0 ? (
          <p style={{ color: "var(--gray-500)", fontSize: 14 }}>No transactions yet</p>
        ) : (
          <div className="txn-list">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="txn-item"
                onClick={() => setSelectedTxn(txn)}
              >
                <div className="txn-info">
                  <span className="txn-desc">{txn.description}</span>
                  <span className="txn-date">{formatDate(txn.transacted_at)}</span>
                </div>
                <span className="txn-amount">{formatNaira(txn.amount_kobo)}</span>
              </div>
            ))}
          </div>
        )}

        {cursor && (
          <button className="btn btn-secondary btn-full" onClick={loadMore} style={{ marginTop: 16 }}>
            Load More
          </button>
        )}
      </div>

      {selectedTxn && (
        <div className="modal-overlay" onClick={() => setSelectedTxn(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-amount">{formatNaira(selectedTxn.amount_kobo)}</h2>
            <div className="modal-detail">
              <span className="modal-label">Merchant</span>
              <span className="modal-value">{selectedTxn.description}</span>
            </div>
            <div className="modal-detail">
              <span className="modal-label">Date</span>
              <span className="modal-value">{formatDate(selectedTxn.transacted_at)}</span>
            </div>
            <div className="modal-detail">
              <span className="modal-label">Type</span>
              <span className="modal-value">Debit</span>
            </div>
            <div className="modal-detail">
              <span className="modal-label">Status</span>
              <span className="modal-value">{selectedTxn.status}</span>
            </div>
            <button className="btn btn-ghost btn-full" onClick={() => setSelectedTxn(null)} style={{ marginTop: 20 }}>
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .range-toggle {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .toggle-btn {
          padding: 8px 16px;
          border: 1px solid var(--gray-300);
          background: var(--background);
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
        }
        .toggle-btn.active {
          background: var(--foreground);
          color: var(--background);
          border-color: var(--foreground);
        }
        .chart-card {
          margin-bottom: 24px;
        }
        .chart-summary {
          text-align: center;
          margin-bottom: 20px;
        }
        .chart-total {
          font-size: 28px;
          font-weight: 700;
          display: block;
        }
        .chart-change {
          font-size: 14px;
          margin-top: 4px;
        }
        .chart-change.up { color: var(--danger); }
        .chart-change.down { color: var(--success); }
        .chart-bars {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          height: 150px;
          gap: 8px;
          margin-bottom: 12px;
        }
        .bar-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }
        .bar {
          width: 100%;
          background: var(--foreground);
          border-radius: 4px 4px 0 0;
          min-height: 4px;
        }
        .bar-label {
          font-size: 11px;
          color: var(--gray-500);
          margin-top: 8px;
        }
        .chart-period {
          font-size: 12px;
          color: var(--gray-500);
          text-align: center;
        }
        .section {
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .txn-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .txn-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: var(--gray-50);
          border-radius: 8px;
          cursor: pointer;
        }
        .txn-info {
          display: flex;
          flex-direction: column;
        }
        .txn-desc {
          font-size: 14px;
          font-weight: 500;
        }
        .txn-date {
          font-size: 12px;
          color: var(--gray-500);
        }
        .txn-amount {
          font-size: 14px;
          font-weight: 600;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
        }
        .modal {
          background: var(--background);
          border-radius: 16px;
          padding: 24px;
          width: 100%;
          max-width: 400px;
        }
        .modal-amount {
          font-size: 36px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 24px;
        }
        .modal-detail {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid var(--gray-200);
        }
        .modal-label {
          font-size: 14px;
          color: var(--gray-500);
        }
        .modal-value {
          font-size: 14px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}