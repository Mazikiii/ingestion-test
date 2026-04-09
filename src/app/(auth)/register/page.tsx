"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/auth";
import { setTokens } from "@/lib/api";

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
      await authApi.register(email);
      setMessage("Check your email for the code");
      setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await authApi.register(email);
      setMessage("New code sent to your email");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resend code");
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
      const data = await authApi.verifyOtp(email, otp);
      setTokens(data.accessToken, data.refreshToken);
      router.push("/onboarding");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setError("");
      const redirectUrl = `${window.location.origin}/auth/google/callback`;
      const data = await authApi.googleStart(redirectUrl);
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start Google login");
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
            onClick={handleResendOtp}
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            Resend Code
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