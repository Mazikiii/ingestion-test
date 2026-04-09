"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !pin) {
      setError("Enter email and PIN");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, pin });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Login failed");
        return;
      }
      const data = await res.json();
      api.setTokens(data.accessToken, data.refreshToken);
      router.push("/");
    } catch (e) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      const redirectUrl = `${window.location.origin}/auth/google/callback`;
      const res = await fetch(`/api/auth/google/start?redirect_url=${encodeURIComponent(redirectUrl)}`);
      
      console.log("OAuth response status:", res.status);
      console.log("OAuth response OK:", res.ok);
      console.log("Content-Type:", res.headers.get("content-type"));
      
      if (!res.ok) {
        const text = await res.text();
        console.log("Error response text:", text);
        setError(`Error: ${res.status}`);
        return;
      }
      
      const text = await res.text();
      console.log("Response text length:", text.length);
      
      if (!text) {
        setError("Empty response from server");
        return;
      }
      
      const data = JSON.parse(text);
      console.log("Parsed data:", data);
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("No OAuth URL in response");
      }
    } catch (e) {
      console.error("OAuth fetch error:", e);
      setError("Cannot reach server. Please try again.");
    }
  };

  return (
    <div className="container">
      <h1 className="title">Nero</h1>
      <p className="subtitle">Welcome back</p>

      <button className="btn btn-secondary btn-full" onClick={handleGoogleLogin} style={{ marginBottom: 24 }}>
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

      <div className="form-group">
        <label className="label">PIN</label>
        <input
          className="input"
          type="password"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="4-digit PIN"
        />
      </div>

      {error && <p className="error">{error}</p>}

      <button className="btn btn-primary btn-full" onClick={handleLogin} disabled={loading}>
        {loading ? "Please wait..." : "Sign In"}
      </button>

      <p className="text-center" style={{ marginTop: 16, fontSize: 14 }}>
        <span style={{ color: "var(--gray-500)" }}>Don&apos;t have an account? </span>
        <span className="link" onClick={() => router.push("/register")}>Create one</span>
      </p>

      <p className="text-center" style={{ marginTop: 12, fontSize: 14 }}>
        <span className="link" onClick={() => router.push("/reset-pin")}>Forgot PIN?</span>
      </p>
    </div>
  );
}