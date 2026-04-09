"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type Step = "email" | "otp";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    if (!email) {
      setError("Enter your email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      console.log("Register response:", res.status, res.statusText);
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || `Error: ${res.status}`);
        return;
      }
      
      const data = await res.json();
      console.log("Register data:", data);
      setMessage("Check your email for the code");
      setStep("otp");
    } catch (e) {
      console.error("Register error:", e);
      setError("Cannot reach server");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 4) {
      setError("Enter the 4-digit code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      
      console.log("Verify response:", res.status, res.statusText);
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || `Error: ${res.status}`);
        return;
      }
      
      const data = await res.json();
      console.log("Verify data:", data);
      api.setTokens(data.accessToken, data.refreshToken);
      router.push("/onboarding");
    } catch (e) {
      console.error("Verify error:", e);
      setError("Cannot reach server");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const redirectUrl = `${window.location.origin}/auth/google/callback`;
      const res = await fetch(`/api/auth/google/start?redirect_url=${encodeURIComponent(redirectUrl)}`);
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || `Error: ${res.status}`);
        return;
      }
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("No OAuth URL received");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to connect. Check your connection.");
    }
  };

  return (
    <div className="container">
      <h1 className="title">Nero</h1>
      <p className="subtitle">
        {step === "email" ? "Create your account" : "Verify your email"}
      </p>

      {step === "email" && (
        <>
          <button className="btn btn-secondary btn-full" onClick={handleGoogleRegister} style={{ marginBottom: 24 }}>
            Continue with Google
          </button>

          <div style={{ textAlign: "center", margin: "16px 0", color: "var(--gray-400)", fontSize: 14 }}>or</div>

          <div className="form-group">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button className="btn btn-primary btn-full" onClick={handleRegister} disabled={loading}>
            {loading ? "Please wait..." : "Continue"}
          </button>

          <p className="text-center" style={{ marginTop: 16, fontSize: 14 }}>
            <span style={{ color: "var(--gray-500)" }}>Already have an account? </span>
            <span className="link" onClick={() => router.push("/login")}>Sign in</span>
          </p>
        </>
      )}

      {step === "otp" && (
        <>
          <p style={{ fontSize: 14, marginBottom: 20, color: "var(--gray-500)" }}>
            We sent a code to {email}
          </p>

          <div className="form-group">
            <label className="label">Verification Code</label>
            <input
              className="input"
              type="text"
              maxLength={4}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4-digit code"
              style={{ textAlign: "center", letterSpacing: 8, fontSize: 20 }}
            />
          </div>

          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}

          <button className="btn btn-primary btn-full" onClick={handleVerifyOtp} disabled={loading}>
            {loading ? "Please wait..." : "Verify"}
          </button>

          <button
            className="btn btn-ghost btn-full"
            onClick={() => { setStep("email"); setError(""); }}
          >
            Back
          </button>
        </>
      )}
    </div>
  );
}