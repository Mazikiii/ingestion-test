"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api, { formatNaira, formatDate } from "@/lib/api";

type SpendingPace = {
  monthly_budget_kobo: string;
  spent_this_month_kobo: string;
  remaining_kobo: string;
  percentage_used: number;
  days_until_reset: number;
  month_start_date: string;
  month_end_date: string;
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

      {spendingPace && (
        <div className="card spending-card">
          <div className="spending-main">
            <span className="spending-label">Spent this month</span>
            <span className="spending-amount">{formatNaira(spendingPace.spent_this_month_kobo)}</span>
            <span className="spending-context">
              of {formatNaira(spendingPace.monthly_budget_kobo)} budget
            </span>
          </div>
          <div className="spending-stats">
            <div className="stat">
              <span className="stat-label">Remaining</span>
              <span className="stat-value">{formatNaira(spendingPace.remaining_kobo)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Used</span>
              <span className="stat-value">{spendingPace.percentage_used}%</span>
            </div>
          </div>
        </div>
      )}

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
        .spending-card {
          margin-bottom: 20px;
        }
        .spending-main {
          text-align: center;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--gray-200);
          margin-bottom: 16px;
        }
        .spending-label {
          font-size: 12px;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .spending-amount {
          display: block;
          font-size: 32px;
          font-weight: 700;
          margin: 8px 0;
        }
        .spending-context {
          font-size: 14px;
          color: var(--gray-500);
        }
        .spending-stats {
          display: flex;
          justify-content: space-around;
        }
        .stat {
          text-align: center;
        }
        .stat-label {
          display: block;
          font-size: 12px;
          color: var(--gray-500);
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 18px;
          font-weight: 600;
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