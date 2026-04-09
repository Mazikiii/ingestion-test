"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type Insight = {
  id: string;
  cycle_start?: string;
  cycle_end?: string;
  period_start?: string;
  period_end?: string;
  status: "building" | "ready" | "no_activity" | "played";
  total_spent_kobo: string;
  days_tracked?: number;
  total_days?: number;
  played_at?: string;
};

type InsightsData = {
  currentWeek: Insight | null;
  previousWeeks: Insight[];
  currentCycle: Insight | null;
  previousCycles: Insight[];
};

type InsightTab = "weeks" | "cycles";

export default function InsightsPage() {
  const router = useRouter();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<InsightTab>("weeks");

  const getStart = (insight: Insight) => insight.period_start || insight.cycle_start || "";
  const getEnd = (insight: Insight) => insight.period_end || insight.cycle_end || "";

  const navigateToDetail = (insight: Insight, type: InsightTab) => {
    router.push(`/insights/${insight.id}?type=${type}`);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [weeksRes, cyclesRes] = await Promise.all([
        api.get("/insights/weeks"),
        api.get("/insights/cycles"),
      ]);

      const weeksData = weeksRes.ok ? await weeksRes.json() : { current: null, previous: [] };
      const cyclesData = cyclesRes.ok ? await cyclesRes.json() : { current: null, previous: [] };

      setData({
        currentWeek: weeksData.current || null,
        previousWeeks: weeksData.previous || [],
        currentCycle: cyclesData.current || null,
        previousCycles: cyclesData.previous || [],
      });
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

      <div className="tab-row">
        <button
          className={`tab-btn ${tab === "weeks" ? "active" : ""}`}
          onClick={() => setTab("weeks")}
          type="button"
        >
          Weekly
        </button>
        <button
          className={`tab-btn ${tab === "cycles" ? "active" : ""}`}
          onClick={() => setTab("cycles")}
          type="button"
        >
          Cycle
        </button>
      </div>

      <div className="section">
        <h3 className="section-title">{tab === "weeks" ? "Current Week" : "Current Cycle"}</h3>
        {((tab === "weeks" ? data?.currentWeek : data?.currentCycle)) && (
          <div
            className="insight-card card"
            onClick={() =>
              navigateToDetail(
                (tab === "weeks" ? data?.currentWeek : data?.currentCycle) as Insight,
                tab
              )
            }
          >
            <div className="insight-header">
              <span className="insight-period">
                {getStart((tab === "weeks" ? data?.currentWeek : data?.currentCycle) as Insight)} - {getEnd((tab === "weeks" ? data?.currentWeek : data?.currentCycle) as Insight)}
              </span>
              <span className={`insight-status ${(tab === "weeks" ? data?.currentWeek : data?.currentCycle)?.status}`}>
                {(tab === "weeks" ? data?.currentWeek : data?.currentCycle)?.status}
              </span>
            </div>
            <p className="insight-spent">
              N{(
                parseInt(
                  String((tab === "weeks" ? data?.currentWeek : data?.currentCycle)?.total_spent_kobo || "0"),
                  10
                ) / 100
              ).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </p>
            {(tab === "weeks" ? data?.currentWeek : data?.currentCycle)?.status === "building" &&
              (tab === "weeks" ? data?.currentWeek : data?.currentCycle)?.days_tracked !== undefined && (
              <p className="insight-days">
                {(tab === "weeks" ? data?.currentWeek : data?.currentCycle)?.days_tracked}/
                {(tab === "weeks" ? data?.currentWeek : data?.currentCycle)?.total_days} days tracked
              </p>
            )}
          </div>
        )}
      </div>

      <div className="section">
        <h3 className="section-title">{tab === "weeks" ? "Previous Weeks" : "Previous Cycles"}</h3>
        {(tab === "weeks" ? data?.previousWeeks : data?.previousCycles)?.length === 0 ? (
          <p style={{ color: "var(--gray-500)", fontSize: 14 }}>
            No previous {tab === "weeks" ? "weekly" : "cycle"} insights
          </p>
        ) : (
          <div className="insights-list">
            {(tab === "weeks" ? data?.previousWeeks : data?.previousCycles)?.map((insight) => (
              <div
                key={insight.id}
                className="insight-card card"
                onClick={() => navigateToDetail(insight, tab)}
              >
                <div className="insight-header">
                  <span className="insight-period">
                    {getStart(insight)} - {getEnd(insight)}
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
        .tab-row {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .tab-btn {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid var(--gray-300);
          border-radius: 10px;
          background: transparent;
          color: var(--foreground);
          font-size: 14px;
          cursor: pointer;
        }
        .tab-btn.active {
          background: var(--foreground);
          color: var(--background);
          border-color: var(--foreground);
        }
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
