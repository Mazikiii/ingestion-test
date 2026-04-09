"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type Insight = {
  id: string;
  period_start: string;
  period_end: string;
  status: "building" | "ready" | "no_activity" | "played";
  total_spent_kobo: string;
  days_tracked?: number;
  total_days?: number;
  played_at?: string;
};

type InsightsData = {
  current: Insight;
  previous: Insight[];
};

export default function InsightsPage() {
  const router = useRouter();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [weeksRes, cyclesRes] = await Promise.all([
        api.get("/insights/weeks"),
        api.get("/insights/cycles"),
      ]);

      if (weeksRes.ok) {
        const weeksData = await weeksRes.json();
        setData({
          current: { ...weeksData.current, type: "week" },
          previous: (weeksData.previous || []).map((p: Insight) => ({ ...p, type: "week" })),
        });
      }
    } catch (e) {
      // Silent fail
    } finally {
      setLoading(false);
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
        <h1 className="logo">Insights</h1>
      </header>

      <div className="section">
        <h3 className="section-title">This Week</h3>
        {data?.current && (
          <div
            className="insight-card card"
            onClick={() => router.push(`/insights/${data.current.id}?type=week`)}
          >
            <div className="insight-header">
              <span className="insight-period">
                {data.current.period_start} - {data.current.period_end}
              </span>
              <span className={`insight-status ${data.current.status}`}>
                {data.current.status}
              </span>
            </div>
            <p className="insight-spent">
              N{(parseInt(data.current.total_spent_kobo, 10) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </p>
            {data.current.status === "building" && data.current.days_tracked !== undefined && (
              <p className="insight-days">{data.current.days_tracked}/{data.current.total_days} days tracked</p>
            )}
          </div>
        )}
      </div>

      <div className="section">
        <h3 className="section-title">Previous Weeks</h3>
        {data?.previous?.length === 0 ? (
          <p style={{ color: "var(--gray-500)", fontSize: 14 }}>No previous insights</p>
        ) : (
          <div className="insights-list">
            {data?.previous?.map((insight) => (
              <div
                key={insight.id}
                className="insight-card card"
                onClick={() => router.push(`/insights/${insight.id}?type=week`)}
              >
                <div className="insight-header">
                  <span className="insight-period">
                    {insight.period_start} - {insight.period_end}
                  </span>
                  <span className={`insight-status ${insight.status}`}>
                    {insight.status}
                  </span>
                </div>
                <p className="insight-spent">
                  N{(parseInt(insight.total_spent_kobo, 10) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .section {
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .insight-card {
          cursor: pointer;
          margin-bottom: 12px;
        }
        .insight-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .insight-period {
          font-size: 12px;
          color: var(--gray-500);
        }
        .insight-status {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .insight-status.ready {
          background: var(--success);
          color: white;
        }
        .insight-status.played {
          background: var(--gray-300);
          color: var(--gray-700);
        }
        .insight-status.building {
          background: var(--warning);
          color: white;
        }
        .insight-status.no_activity {
          background: var(--gray-200);
          color: var(--gray-600);
        }
        .insight-spent {
          font-size: 20px;
          font-weight: 600;
        }
        .insight-days {
          font-size: 12px;
          color: var(--gray-500);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}