"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api, { handleApiResponse } from "@/lib/api";

type Bank = {
  id: string;
  name: string;
  code: string;
  has_email_alerts: boolean;
  is_supported: boolean;
};

type BankChangeFlow = "none" | "bank_select" | "email_connect";

export default function SettingsPage() {
  const router = useRouter();
  const [flow, setFlow] = useState<BankChangeFlow>("none");
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [gmailUrl, setGmailUrl] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (flow === "bank_select") {
      loadBanks();
    }
  }, [flow]);

  const loadBanks = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/banks");
      if (res.ok) {
        const data = await res.json();
        setBanks(Array.isArray(data) ? data : data.banks || []);
      }
    } catch (e) {
      setError("Failed to load banks");
    } finally {
      setLoading(false);
    }
  };

  const handleStartChangeBank = () => {
    setFlow("bank_select");
    setError("");
    setMessage("");
  };

  const handleSelectBank = () => {
    if (!selectedBankId) {
      setError("Select a bank");
      return;
    }
    proceedToEmailConnect();
  };

  const proceedToEmailConnect = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.patch("/banks/primary", { bank_id: selectedBankId });
      await handleApiResponse<{ bank: Bank }>(res);
      setFlow("email_connect");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save bank");
    } finally {
      setLoading(false);
    }
  };

  const handleGetGmailLink = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/ingestion/gmail/connect");
      const data = await handleApiResponse<{ url: string }>(res);
      setGmailUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get Gmail link");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckGmailStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/ingestion/gmail/status");
      const data = await handleApiResponse<{ connected: boolean }>(res);
      if (data.connected) {
        setMessage("Gmail connected successfully");
        setTimeout(() => router.push("/home"), 1500);
      } else {
        setError("Gmail not connected yet");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check Gmail status");
    } finally {
      setLoading(false);
    }
  };

  if (flow === "bank_select") {
    return (
      <div className="container">
        <header className="header">
          <button className="btn btn-ghost" onClick={() => setFlow("none")}>
            ← Back
          </button>
          <h1 className="logo">Select Bank</h1>
          <div style={{ width: 60 }} />
        </header>

        <div className="card">
          <p className="subtitle">Choose your bank</p>

          {loading && banks.length === 0 ? (
            <p>Loading banks...</p>
          ) : (
            <div className="form-group">
              <select
                className="select"
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                disabled={loading}
              >
                <option value="">Select your bank</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="error">{error}</p>}

          <button
            className="btn btn-primary btn-full"
            onClick={handleSelectBank}
            disabled={loading || !selectedBankId}
          >
            {loading ? "Please wait..." : "Continue"}
          </button>
        </div>

        <style jsx>{`
          .card {
            border-radius: 16px;
          }
          .subtitle {
            font-size: 15px;
            color: var(--gray-500);
            margin-bottom: 20px;
          }
        `}</style>
      </div>
    );
  }

  if (flow === "email_connect") {
    return (
      <div className="container">
        <header className="header">
          <button className="btn btn-ghost" onClick={() => setFlow("none")}>
            ← Back
          </button>
          <h1 className="logo">Connect Email</h1>
          <div style={{ width: 60 }} />
        </header>

        <div className="card">
          <h2 className="title">Reconnect your Gmail</h2>
          <p className="subtitle">Connect your Gmail to track bank alerts</p>

          {message && <p className="success">{message}</p>}

          {!gmailUrl ? (
            <button
              className="btn btn-primary btn-full"
              onClick={handleGetGmailLink}
              disabled={loading}
            >
              {loading ? "Please wait..." : "Get Link"}
            </button>
          ) : (
            <>
              <p style={{ fontSize: 14, marginBottom: 16 }}>
                Click the link, sign in with Google, and approve access. Then come back and click Continue.
              </p>
              <a
                href={gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-full"
                style={{ marginBottom: 12, display: "block", textAlign: "center" }}
              >
                Open Google Sign-In
              </a>
            </>
          )}

          <button
            className="btn btn-primary btn-full"
            onClick={handleCheckGmailStatus}
            disabled={loading}
            style={{ marginTop: gmailUrl ? 0 : 12 }}
          >
            {loading ? "Checking..." : "I've Connected - Continue"}
          </button>

          {error && <p className="error">{error}</p>}
        </div>

        <style jsx>{`
          .card {
            border-radius: 16px;
          }
          .title {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .subtitle {
            font-size: 15px;
            color: var(--gray-500);
            margin-bottom: 24px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <button className="btn btn-ghost" onClick={() => router.back()}>
          ← Back
        </button>
        <h1 className="logo">Settings</h1>
        <div style={{ width: 60 }} />
      </header>

      <div className="section">
        <button
          className="settings-option card"
          onClick={handleStartChangeBank}
        >
          <div className="settings-option-content">
            <span className="settings-option-icon">🏦</span>
            <span className="settings-option-text">Change Bank & Email</span>
          </div>
          <span className="settings-option-arrow">→</span>
        </button>
      </div>

      <style jsx>{`
        .section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .settings-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: opacity 0.2s;
        }
        .settings-option:active {
          opacity: 0.7;
        }
        .settings-option-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .settings-option-icon {
          font-size: 20px;
        }
        .settings-option-text {
          font-size: 16px;
          font-weight: 500;
        }
        .settings-option-arrow {
          font-size: 18px;
          color: var(--gray-400);
        }
      `}</style>
    </div>
  );
}