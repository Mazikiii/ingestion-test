"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/auth";
import { setTokens } from "@/lib/api";

type Step = "email" | "otp" | "newPin";

export default function ResetPinPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    if (!email) {
      setError("Enter your email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.resetPinRequest(email);
      setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send code");
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
      await authApi.resetPinVerify(email, otp);
      setStep("newPin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPin = async () => {
    if (!pin || pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await authApi.resetPin(pin, confirmPin);
      setTokens(data.accessToken, data.refreshToken);
      router.push("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Reset PIN</h1>
      <p className="subtitle">
        {step === "email" && "Enter your email"}
        {step === "otp" && "Enter the code"}
        {step === "newPin" && "Create a new PIN"}
      </p>

      {step === "email" && (
        <>
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
          <button className="btn btn-primary btn-full" onClick={handleSendOtp} disabled={loading}>
            {loading ? "Please wait..." : "Send Code"}
          </button>
          <p className="text-center" style={{ marginTop: 16, fontSize: 14 }}>
            <span className="link" onClick={() => router.push("/login")}>Back to login</span>
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
          <button className="btn btn-primary btn-full" onClick={handleVerifyOtp} disabled={loading}>
            {loading ? "Please wait..." : "Verify"}
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => setStep("email")}>
            Back
          </button>
        </>
      )}

      {step === "newPin" && (
        <>
          <div className="form-group">
            <label className="label">New PIN</label>
            <input
              className="input"
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4-digit PIN"
            />
          </div>
          <div className="form-group">
            <label className="label">Confirm PIN</label>
            <input
              className="input"
              type="password"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4-digit PIN"
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary btn-full" onClick={handleSetNewPin} disabled={loading}>
            {loading ? "Please wait..." : "Reset PIN"}
          </button>
        </>
      )}
    </div>
  );
}