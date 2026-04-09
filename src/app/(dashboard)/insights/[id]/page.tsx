"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import api, { formatNaira } from "@/lib/api";

type InsightDetail = {
  id: string;
  cycle_start?: string;
  cycle_end?: string;
  period_start: string;
  period_end: string;
  status: string;
  total_spent_kobo: string;
  comparison: {
    previous_spent_kobo: string;
    change_percentage: number;
    direction: string;
  };
  daily_average_kobo: string;
  days_on_pace: number;
  days_over_pace: number;
  peak_day: {
    day: string;
    date: string;
    amount_kobo: string;
  } | null;
  lowest_day: {
    day: string;
    date: string;
    amount_kobo: string;
  } | null;
  mood: {
    key: string;
    label: string;
  };
};

export default function InsightDetailPage() {
  return (
    <Suspense fallback={<div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>Loading...</div>}>
      <InsightDetailContent />
    </Suspense>
  );
}

function InsightDetailContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const typeParam = searchParams.get("type");
  const type = typeParam === "cycles" ? "cycles" : "weeks";
  
  const [insight, setInsight] = useState<InsightDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (id) loadInsight();
  }, [id, type]);

  const loadInsight = async () => {
    try {
      const res = await api.get(`/insights/${type}/${id}`);
      if (res.ok) {
        setInsight(await res.json());
      }
    } catch (e) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPlayed = async () => {
    if (!id || insight?.status !== "ready") return;
    setPlaying(true);
    try {
      const res = await api.post(`/insights/${type}/${id}/played`);
      if (res.ok) {
        const data = await res.json();
        setInsight(data.insight);
      }
    } catch (e) {
      // Silent fail
    } finally {
      setPlaying(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        Loading...
      </div>
    );
  }

  if (!insight) {
    return (
      <div className="container">
        <p>Insight not found</p>
        <button className="btn btn-secondary" onClick={() => router.back()}>Back</button>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <button className="btn btn-ghost" onClick={() => router.back()}>Back</button>
        <h1 className="logo">Insight</h1>
        <div style={{ width: 60 }} />
      </header>

      <div className="card" style={{ marginBottom: 20 }}>
        <p className="period">{(insight.period_start || insight.cycle_start)} - {(insight.period_end || insight.cycle_end)}</p>
        <p className="total-spent">{formatNaira(insight.total_spent_kobo)}</p>
        {insight.comparison && (
          <p className={`comparison ${insight.comparison.direction}`}>
            {insight.comparison.direction === "up" ? "↑" : "↓"} {Math.abs(insight.comparison.change_percentage)}% vs previous period
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Daily Average</h3>
        <p className="stat-value">{formatNaira(insight.daily_average_kobo)}</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Pace</h3>
        <div className="pace-stats">
          <div className="pace-stat">
            <span className="pace-value">{insight.days_on_pace}</span>
            <span className="pace-label">On Pace</span>
          </div>
          <div className="pace-stat">
            <span className="pace-value">{insight.days_over_pace}</span>
            <span className="pace-label">Over Pace</span>
          </div>
        </div>
      </div>

      {insight.peak_day && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">Peak Day</h3>
          <p className="stat-value">{insight.peak_day.day}</p>
          <p className="stat-detail">{formatNaira(insight.peak_day.amount_kobo)}</p>
        </div>
      )}

      {insight.lowest_day && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="card-title">Lowest Day</h3>
          <p className="stat-value">{insight.lowest_day.day}</p>
          <p className="stat-detail">{formatNaira(insight.lowest_day.amount_kobo)}</p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Mood</h3>
        <p className="mood">{insight.mood.label}</p>
      </div>

      {insight.status === "ready" && (
        <button className="btn btn-primary btn-full" onClick={handleMarkPlayed} disabled={playing}>
          {playing ? "Please wait..." : "Mark as Played"}
        </button>
      )}

      <style jsx>{`
        .period {
          font-size: 14px;
          color: var(--gray-500);
          text-align: center;
          margin-bottom: 8px;
        }
        .total-spent {
          font-size: 36px;
          font-weight: 700;
          text-align: center;
        }
        .comparison {
          text-align: center;
          font-size: 14px;
          margin-top: 8px;
        }
        .comparison.up { color: var(--danger); }
        .comparison.down { color: var(--success); }
        .card-title {
          font-size: 12px;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 600;
        }
        .stat-detail {
          font-size: 14px;
          color: var(--gray-500);
        }
        .pace-stats {
          display: flex;
          justify-content: space-around;
        }
        .pace-stat {
          text-align: center;
        }
        .pace-value {
          display: block;
          font-size: 24px;
          font-weight: 600;
        }
        .pace-label {
          font-size: 12px;
          color: var(--gray-500);
        }
        .mood {
          font-size: 20px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
