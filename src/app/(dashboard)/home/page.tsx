"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api, { formatNaira, formatDate } from "@/lib/api";

type SpendingPace = {
  monthly_budget_kobo: string;
  spent_this_month_kobo: string;
  remaining_kobo: string;
  safe_daily_spend_kobo: string;
  percentage_used: number;
  days_until_reset: number;
  month_start_date: string;
  month_end_date: string;
  is_full_month: boolean;
};

type Transaction = {
  id: string;
  amount_kobo: string;
  description: string;
  transacted_at: string;
};

type QuizStatus = {
  status: "not_started" | "in_progress" | "completed" | "expired";
  weekIdentifier: string;
};

export default function HomePage() {
  const router = useRouter();
  const [spendingPace, setSpendingPace] = useState<SpendingPace | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [quizStatus, setQuizStatus] = useState<QuizStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [paceRes, txnRes, quizRes] = await Promise.all([
        api.get("/spending-pace"),
        api.get("/transactions?limit=5"),
        api.get("/quiz/status"),
      ]);

      if (paceRes.ok) {
        const data = await paceRes.json();
        setSpendingPace(data.spending_pace);
      }

      if (txnRes.ok) {
        const data = await txnRes.json();
        setTransactions(data.transactions || []);
      }

      if (quizRes.ok) {
        setQuizStatus(await quizRes.json());
      }
    } catch (e) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.clearTokens();
    router.push("/login");
  };

  const getQuizButtonText = () => {
    if (!quizStatus) return null;
    switch (quizStatus.status) {
      case "not_started": return "Take Quiz";
      case "in_progress": return "Continue Quiz";
      case "completed": return "View Result";
      case "expired": return "Quiz ended";
      default: return null;
    }
  };

  const handleQuizClick = () => {
    if (!quizStatus) return;
    if (quizStatus.status === "not_started" || quizStatus.status === "in_progress") {
      router.push("/quiz");
    } else if (quizStatus.status === "completed") {
      router.push("/quiz?result=true");
    }
  };

  const parseApiDate = (value?: string) => {
    if (typeof value !== "string") return null;
    const parts = value.split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
      return null;
    }
    const [year, month, day] = parts;
    return new Date(Date.UTC(year, month - 1, day));
  };

  const getCycleProgress = (pace: SpendingPace) => {
    const dayMs = 24 * 60 * 60 * 1000;
    const cycleStart = parseApiDate(pace.month_start_date);
    const cycleEnd = parseApiDate(pace.month_end_date);
    if (!cycleStart || !cycleEnd) return null;

    const todayRaw = new Date();
    const today = new Date(Date.UTC(todayRaw.getUTCFullYear(), todayRaw.getUTCMonth(), todayRaw.getUTCDate()));

    const totalDays = Math.floor((cycleEnd.getTime() - cycleStart.getTime()) / dayMs) + 1;
    const elapsed = Math.floor((today.getTime() - cycleStart.getTime()) / dayMs) + 1;
    const dayOfCycle = Math.min(Math.max(elapsed, 1), totalDays);

    return { dayOfCycle, totalDays };
  };

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
        <span className="logo">Nero</span>
        <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
      </header>

      {error && <p className="error">{error}</p>}

      {spendingPace && (() => {
        const cycle = getCycleProgress(spendingPace);

        return (
          <>
            <div className="spending-target-card">
              <span className="spending-target-label">Today&apos;s spending target</span>
              <span className="spending-target-amount">{formatNaira(spendingPace.safe_daily_spend_kobo)}</span>
              <span className="spending-target-context">
                From your {formatNaira(spendingPace.monthly_budget_kobo)} Budget
              </span>
            </div>

            <div className="card budget-status-card">
              <div className="budget-status-header">
                <span className="budget-status-title">Budget Status</span>
                {cycle && <span className="budget-status-day">Day {cycle.dayOfCycle} of {cycle.totalDays}</span>}
              </div>

              <p className="budget-status-percent">{spendingPace.percentage_used}% Spent</p>

              <div className="budget-progress-track">
                <div
                  className="budget-progress-fill"
                  style={{ width: `${Math.max(0, Math.min(spendingPace.percentage_used, 100))}%` }}
                />
              </div>

              <div className="budget-values">
                <div className="budget-value-group">
                  <span className="budget-label">Spent</span>
                  <span className="budget-value">{formatNaira(spendingPace.spent_this_month_kobo)}</span>
                </div>
                <div className="budget-value-group budget-value-group-right">
                  <span className="budget-label">Remaining</span>
                  <span className="budget-value budget-value-highlight">{formatNaira(spendingPace.remaining_kobo)}</span>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {quizStatus && quizStatus.status !== "expired" && (
        <button className="btn btn-secondary btn-full" onClick={handleQuizClick} style={{ marginBottom: 20 }}>
          {getQuizButtonText()}
        </button>
      )}

      <div className="section">
        <h3 className="section-title">Recent Transactions</h3>
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
            <button className="btn btn-ghost btn-full" onClick={() => setSelectedTxn(null)} style={{ marginTop: 20 }}>
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .spending-target-card {
          margin-bottom: 18px;
          border-radius: 20px;
          padding: 20px;
          background: radial-gradient(circle at 15% 20%, #9ca7ff 0%, #6e79ec 42%, #3341b4 100%);
          color: #f8faff;
          box-shadow: 0 14px 32px rgba(34, 48, 136, 0.34);
        }
        .spending-target-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          opacity: 0.92;
          margin-bottom: 10px;
        }
        .spending-target-amount {
          display: block;
          font-size: 52px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 10px;
        }
        .spending-target-context {
          font-size: 15px;
          color: rgba(247, 250, 255, 0.86);
        }
        .budget-status-card {
          margin-bottom: 20px;
        }
        .budget-status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .budget-status-title {
          font-size: 15px;
          font-weight: 600;
        }
        .budget-status-day {
          font-size: 14px;
          color: var(--gray-500);
        }
        .budget-status-percent {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .budget-progress-track {
          width: 100%;
          height: 8px;
          border-radius: 999px;
          background: var(--gray-200);
          overflow: hidden;
          margin-bottom: 14px;
        }
        .budget-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #2d42b6 0%, #4b58d3 100%);
        }
        .budget-values {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .budget-value-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .budget-value-group-right {
          text-align: right;
        }
        .budget-label {
          font-size: 13px;
          color: var(--gray-500);
        }
        .budget-value {
          font-size: 29px;
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }
        .budget-value-highlight {
          color: #2f3fae;
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
        @media (max-width: 520px) {
          .spending-target-amount {
            font-size: 44px;
          }
          .budget-value {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
