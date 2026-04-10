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
  const [range, setRange] = useState<"week" | "cycle" | "last_cycle">("week");
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

  const parseApiDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };

  const formatNairaWhole = (kobo: string | number) => {
    const value = typeof kobo === "string" ? parseInt(kobo, 10) : kobo;
    const naira = Math.round(value / 100);
    return `N${naira.toLocaleString("en-NG")}`;
  };

  const daysInPeriod = trend
    ? Math.max(
        1,
        Math.floor(
          (parseApiDate(trend.period_end).getTime() - parseApiDate(trend.period_start).getTime()) /
            (24 * 60 * 60 * 1000)
        ) + 1
      )
    : 1;

  const avgDailySpendKobo = trend
    ? Math.round(parseInt(trend.total_spent_kobo, 10) / daysInPeriod)
    : 0;

  const maxAmount = trend?.bars.reduce((max, bar) => {
    const amt = parseInt(bar.amount_kobo, 10);
    return amt > max ? amt : max;
  }, 0) || 1;

  const peakBarKey = trend?.bars.find((bar) => parseInt(bar.amount_kobo, 10) === maxAmount)?.key;

  const getBarHeight = (amountKobo: number) => {
    if (amountKobo <= 0) return 8;
    const ratio = amountKobo / maxAmount;
    const eased = Math.pow(ratio, 0.7);
    const min = 18;
    const max = 122;
    return Math.round(min + eased * (max - min));
  };

  const rangeLabel =
    range === "week" ? "This Week" : range === "cycle" ? "This Cycle" : "Last Cycle";

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

      <div className="activity-toolbar card">
        <div className="search-shell" aria-hidden>
          <span className="search-icon">○</span>
          <span className="search-text">Search Activity</span>
        </div>
        <button className="filter-button" type="button" aria-label="Filter activity" disabled>
          ≡
        </button>
      </div>

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
          {trend?.available_ranges?.includes("last_cycle") && (
            <button
              className={`toggle-btn ${range === "last_cycle" ? "active" : ""}`}
              onClick={() => setRange("last_cycle")}
            >
              Last Cycle
            </button>
          )}
        </div>

        {trend && (
          <div className="chart-card card">
            <div className="chart-summary">
              <div>
                <p className="chart-caption">Avg. daily spend</p>
                <span className="chart-total">{formatNaira(avgDailySpendKobo)}</span>
              </div>
              <span className="range-chip">{rangeLabel}</span>
            </div>

            <div className="chart-meta-row">
              {trend.change_percentage !== null && (
                <span className={`chart-change ${trend.change_percentage > 0 ? "up" : "down"}`}>
                  {trend.change_percentage > 0 ? "+" : ""}{trend.change_percentage}%
                </span>
              )}
            </div>

            <div className="chart-bars">
              {trend.bars.map((bar) => (
                <div key={bar.key} className="bar-container">
                  <span className={`bar-amount ${parseInt(bar.amount_kobo, 10) <= 0 ? "empty" : ""}`}>
                    {parseInt(bar.amount_kobo, 10) > 0 ? formatNairaWhole(bar.amount_kobo) : "N0"}
                  </span>
                  <div
                    className={`bar ${peakBarKey === bar.key && parseInt(bar.amount_kobo, 10) > 0 ? "peak" : ""}`}
                    style={{ height: `${getBarHeight(parseInt(bar.amount_kobo, 10))}px` }}
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
        .activity-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          padding: 10px;
          border-radius: 14px;
        }
        .search-shell {
          flex: 1;
          min-height: 40px;
          border-radius: 11px;
          border: 1px solid var(--gray-200);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          color: var(--gray-400);
          background: var(--background);
        }
        .search-icon {
          font-size: 13px;
        }
        .search-text {
          font-size: 14px;
        }
        .filter-button {
          width: 40px;
          min-width: 40px;
          min-height: 40px;
          border-radius: 11px;
          border: 1px solid var(--gray-200);
          background: var(--background);
          color: var(--gray-400);
          cursor: not-allowed;
          opacity: 1;
        }
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
          border-radius: 16px;
        }
        .chart-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .chart-caption {
          font-size: 13px;
          color: var(--gray-500);
          margin-bottom: 4px;
        }
        .chart-total {
          font-size: 38px;
          font-weight: 700;
          display: block;
          letter-spacing: -0.02em;
        }
        .range-chip {
          font-size: 12px;
          color: var(--gray-500);
          background: var(--gray-100);
          border-radius: 999px;
          padding: 8px 10px;
          align-self: flex-start;
        }
        .chart-meta-row {
          min-height: 22px;
          margin-bottom: 12px;
        }
        .chart-change {
          font-size: 13px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
        }
        .chart-change.up {
          color: var(--success);
          background: #dcfce7;
        }
        .chart-change.down {
          color: var(--danger);
          background: #fee2e2;
        }
        .chart-bars {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          height: 168px;
          gap: 7px;
          margin-bottom: 12px;
        }
        .bar-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
        }
        .bar-amount {
          font-size: 10px;
          color: var(--gray-500);
          margin-bottom: 6px;
          min-height: 14px;
          display: inline-flex;
          align-items: center;
        }
        .bar-amount.empty {
          color: transparent;
          user-select: none;
        }
        .bar {
          width: 100%;
          max-width: 36px;
          background: #d9dce4;
          border-radius: 10px;
          min-height: 8px;
          transition: height 0.25s ease;
        }
        .bar.peak {
          background: #2e38aa;
        }
        .bar-label {
          font-size: 12px;
          color: var(--gray-500);
          margin-top: 7px;
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
