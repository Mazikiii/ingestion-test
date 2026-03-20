"use client";

import { useEffect, useRef, useState } from "react";

type OnboardingStep =
  | "language"
  | "profile"
  | "banks"
  | "email_connect"
  | "budget"
  | "done"
  | string;

type Profile = {
  id?: string;
  email?: string;
  onboarding_step?: OnboardingStep;
  language?: string | null;
  full_name?: string | null;
  age?: number | null;
  life_stage?: string | null;
};

type Bank = {
  id: string | number;
  name: string;
  code?: string;
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId?: string;
};

type RequestOptions = RequestInit & {
  protectedRoute?: boolean;
};

type ProfilePayload = Profile | { profile: Profile };

type SpendingPace = {
  spent_this_month_kobo?: number | null;
  monthly_budget_kobo?: number | null;
  days_remaining?: number | null;
  daily_average_kobo?: number | null;
};

const API_PROXY_BASE = "/api";
const REFRESH_TOKEN_KEY = "refreshToken";
const REFRESH_INTERVAL_MS = 4000;

const VISIBLE_STEPS: OnboardingStep[] = [
  "profile",
  "banks",
  "email_connect",
  "budget",
];

function normalizeStep(step: OnboardingStep | undefined): OnboardingStep {
  if (!step) return "language";
  return step;
}

function normalizeProfilePayload(payload: ProfilePayload): Profile {
  if (
    payload &&
    typeof payload === "object" &&
    "profile" in payload &&
    payload.profile &&
    typeof payload.profile === "object"
  ) {
    return payload.profile;
  }
  return payload as Profile;
}

function koboToNaira(kobo: number | null | undefined): string {
  if (kobo == null) return "—";
  const naira = kobo / 100;
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function Page() {
  const accessTokenRef = useRef<string | null>(null);
  const languageAutoAttemptedRef = useRef(false);
  const restoreSessionStartedRef = useRef(false);
  const spendingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [bootingSession, setBootingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [gmailConnectUrl, setGmailConnectUrl] = useState("");
  const [spendingPace, setSpendingPace] = useState<SpendingPace | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isLoggedIn = Boolean(accessToken);
  const currentStep = normalizeStep(profile?.onboarding_step);

  const currentStepIndex = VISIBLE_STEPS.indexOf(currentStep as OnboardingStep);
  const progressPercent =
    currentStep === "done"
      ? 100
      : currentStepIndex >= 0
        ? Math.round((currentStepIndex / VISIBLE_STEPS.length) * 100)
        : 0;

  function clearMessages() {
    setStatusMessage("");
    setErrorMessage("");
  }

  function setAccessTokenInMemory(nextToken: string | null) {
    accessTokenRef.current = nextToken;
    setAccessToken(nextToken);
  }

  function clearSessionState() {
    setAccessTokenInMemory(null);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setProfile(null);
    setBanks([]);
    setSelectedBankId("");
    setGmailConnectUrl("");
    setSpendingPace(null);
    setGmailConnected(false);
    if (spendingIntervalRef.current) {
      clearInterval(spendingIntervalRef.current);
      spendingIntervalRef.current = null;
    }
  }

  async function extractErrorDetails(response: Response): Promise<string> {
    const bodyText = await response.text().catch(() => "");
    if (!bodyText) return "";
    try {
      return JSON.stringify(JSON.parse(bodyText));
    } catch {
      return bodyText;
    }
  }

  async function rawRequest(path: string, options: RequestOptions = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (options.protectedRoute) {
      const token = accessTokenRef.current;
      if (!token) throw new Error("Please log in to continue.");
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(`${API_PROXY_BASE}${path}`, { ...options, headers });
  }

  async function requestJson<T = unknown>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    let response = await rawRequest(path, options);
    if (response.status === 401 && options.protectedRoute) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        clearSessionState();
        throw new Error("Session expired. Please log in again.");
      }
      const refreshRes = await rawRequest("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      if (!refreshRes.ok) {
        clearSessionState();
        throw new Error("Session expired. Please log in again.");
      }
      const data = (await refreshRes.json()) as AuthResponse;
      setAccessTokenInMemory(data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      response = await rawRequest(path, options);
    }
    if (!response.ok) {
      const details = await extractErrorDetails(response);
      throw new Error(
        details ? `Error ${response.status}: ${details}` : `Request failed: ${response.status}`,
      );
    }
    if (response.status === 204) return null as T;
    return (await response.json()) as T;
  }

  async function loadProfile() {
    const payload = await requestJson<ProfilePayload>("/profile", {
      method: "GET",
      protectedRoute: true,
    });
    const data = normalizeProfilePayload(payload);
    setProfile(data);
    if (data.full_name) setFullName(data.full_name);
  }

  async function loadBanks() {
    const data = await requestJson<{ banks: Bank[] }>("/banks", { method: "GET" });
    setBanks(data.banks ?? []);
  }


  async function registerUser() {
    clearMessages();
    if (!email || !password) {
      setErrorMessage("Please enter your email and password.");
      return;
    }
    setIsLoading(true);
    try {
      await requestJson("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setStatusMessage("Account created. You can now log in.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loginUser() {
    clearMessages();
    if (!email || !password) {
      setErrorMessage("Please enter your email and password.");
      return;
    }
    setIsLoading(true);
    try {
      const data = await requestJson<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAccessTokenInMemory(data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      await loadProfile();
      await loadBanks();
      await checkGmailConnection();
      setStatusMessage("Welcome back!");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function logoutUser() {
    clearMessages();
    if (spendingIntervalRef.current) {
      clearInterval(spendingIntervalRef.current);
      spendingIntervalRef.current = null;
    }
    setIsLoading(true);
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken && accessTokenRef.current) {
        try {
          await requestJson("/auth/logout", {
            method: "POST",
            protectedRoute: true,
            body: JSON.stringify({ refreshToken }),
          });
        } catch {
          // Logout should clear local state even if server call fails
        }
      }
      clearSessionState();
      setEmail("");
      setPassword("");
      setStatusMessage("Logged out.");
    } finally {
      setIsLoading(false);
    }
  }

  async function setName() {
    clearMessages();
    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    setIsLoading(true);
    try {
      await requestJson("/profile", {
        method: "PATCH",
        protectedRoute: true,
        body: JSON.stringify({ full_name: fullName.trim() }),
      });
      await loadProfile();
      setStatusMessage("Name saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitBank() {
    clearMessages();
    if (!selectedBankId) {
      setErrorMessage("Please select your bank.");
      return;
    }
    setIsLoading(true);
    try {
      await requestJson("/onboarding/bank", {
        method: "POST",
        protectedRoute: true,
        body: JSON.stringify({ bank_id: selectedBankId }),
      });
      await loadProfile();
      setStatusMessage("Bank saved.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  async function getGmailConnectUrl() {
    clearMessages();
    setIsLoading(true);
    try {
      const data = await requestJson<{ url: string }>("/ingestion/gmail/connect", {
        method: "GET",
        protectedRoute: true,
      });
      setGmailConnectUrl(data.url);
      setStatusMessage("Ready. Open the link and approve access, then come back.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load connection link.");
    } finally {
      setIsLoading(false);
    }
  }

  function openGmailOauth() {
    clearMessages();
    if (!gmailConnectUrl) {
      setErrorMessage("Click 'Get Link' first.");
      return;
    }
    window.open(gmailConnectUrl, "_blank", "noopener,noreferrer");
    setStatusMessage("Approved? Click 'Continue' when you're back.");
  }

  async function advanceFromEmailConnect() {
    clearMessages();
    setIsLoading(true);
    try {
      await requestJson("/profile", {
        method: "PATCH",
        protectedRoute: true,
        body: JSON.stringify({ advance_step: true }),
      });
      await loadProfile();
      setStatusMessage("Moving to the next step...");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitBudget() {
    clearMessages();
    const amount = Number(monthlyBudget);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Enter a valid monthly budget in naira.");
      return;
    }
    setIsLoading(true);
    try {
      await requestJson("/onboarding/budget", {
        method: "POST",
        protectedRoute: true,
        body: JSON.stringify({ monthly_budget_naira: amount }),
      });
      await loadProfile();
      await checkGmailConnection();
      setStatusMessage("Budget set. You're all done!");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshSpendingPace() {
    clearMessages();
    setIsLoading(true);
    try {
      const data = await requestJson<SpendingPace>("/spending-pace", {
        method: "GET",
        protectedRoute: true,
      });
      setSpendingPace(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load spending data.");
    } finally {
      setIsLoading(false);
    }
  }

  async function checkGmailConnection() {
    try {
      const data = await rawRequest("/ingestion/gmail/connect", {
        method: "GET",
        protectedRoute: true,
      });
      if (data.ok) {
        setGmailConnected(true);
      } else {
        setGmailConnected(false);
      }
    } catch {
      setGmailConnected(false);
    }
  }

  async function disconnectGmail() {
    clearMessages();
    setIsLoading(true);
    try {
      const response = await rawRequest("/ingestion/gmail/disconnect", {
        method: "DELETE",
        protectedRoute: true,
      });
      if (response.status === 404) {
        setStatusMessage("Disconnect is not available yet.");
        return;
      }
      if (!response.ok) {
        const details = await extractErrorDetails(response);
        throw new Error(
          details ? `Error ${response.status}: ${details}` : `Disconnect failed: ${response.status}`,
        );
      }
      await loadProfile();
      setGmailConnected(false);
      setSpendingPace(null);
      if (spendingIntervalRef.current) {
        clearInterval(spendingIntervalRef.current);
        spendingIntervalRef.current = null;
      }
      setStatusMessage("Gmail disconnected.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not disconnect Gmail.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (currentStep !== "done" || !gmailConnected) {
      if (spendingIntervalRef.current) {
        clearInterval(spendingIntervalRef.current);
        spendingIntervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const data = await requestJson<SpendingPace>("/spending-pace", {
          method: "GET",
          protectedRoute: true,
        });
        setSpendingPace(data);
      } catch {
        // Silent fail on auto-refresh
      }
    };

    void poll();
    spendingIntervalRef.current = setInterval(poll, REFRESH_INTERVAL_MS);

    return () => {
      if (spendingIntervalRef.current) {
        clearInterval(spendingIntervalRef.current);
        spendingIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  useEffect(() => {
    if (restoreSessionStartedRef.current) return;
    restoreSessionStartedRef.current = true;

    let cancelled = false;

    async function restoreSession() {
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!storedRefreshToken) {
        setBootingSession(false);
        return;
      }

      try {
        const refreshRes = await fetch(`${API_PROXY_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });

        if (!refreshRes.ok) {
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          return;
        }

        const refreshed = (await refreshRes.json()) as AuthResponse;
        if (cancelled) return;

        setAccessTokenInMemory(refreshed.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshed.refreshToken);

        const profileRes = await fetch(`${API_PROXY_BASE}/profile`, {
          method: "GET",
          headers: { Authorization: `Bearer ${refreshed.accessToken}` },
        });

        if (!profileRes.ok || cancelled) return;

        const profilePayload = (await profileRes.json()) as ProfilePayload;
        const restoredProfile = normalizeProfilePayload(profilePayload);
        setProfile(restoredProfile);
        if (restoredProfile.full_name) setFullName(restoredProfile.full_name);

        const banksRes = await fetch(`${API_PROXY_BASE}/banks`, { method: "GET" });
        if (banksRes.ok && !cancelled) {
          const banksData = (await banksRes.json()) as { banks: Bank[] };
          setBanks(banksData.banks ?? []);
        }

        if (!cancelled) {
          await checkGmailConnection();
        }
      } catch {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      } finally {
        if (!cancelled) setBootingSession(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoggedIn || currentStep !== "language") {
      languageAutoAttemptedRef.current = false;
      return;
    }
    if (isLoading || languageAutoAttemptedRef.current) return;
    languageAutoAttemptedRef.current = true;

    const token = accessTokenRef.current;
    if (!token) {
      languageAutoAttemptedRef.current = false;
      return;
    }

    const autoAdvanceLanguage = async () => {
      setIsLoading(true);
      try {
        const patchRes = await fetch(`${API_PROXY_BASE}/profile`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ language: "en" }),
        });
        if (!patchRes.ok) return;

        const profileRes = await fetch(`${API_PROXY_BASE}/profile`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!profileRes.ok) return;

        const profilePayload = (await profileRes.json()) as ProfilePayload;
        const data = normalizeProfilePayload(profilePayload);
        setProfile(data);
        if (data.full_name) setFullName(data.full_name);
      } catch {
        // Fail silently for auto-advance
      } finally {
        setIsLoading(false);
        languageAutoAttemptedRef.current = false;
      }
    };

    void autoAdvanceLanguage();
  }, [currentStep, isLoading, isLoggedIn]);

  const spent = spendingPace?.spent_this_month_kobo ?? null;
  const budget = spendingPace?.monthly_budget_kobo ?? null;

  return (
    <main className="shell">
      <div className="container">
        <header className="header">
          <h1 className="logo">Nero</h1>
          {isLoggedIn && (
            <button className="btnGhost" onClick={logoutUser} disabled={isLoading}>
              Log out
            </button>
          )}
        </header>

        {!isLoggedIn && authMode === "login" && (
          <div className="card">
            <h2 className="cardTitle">Welcome back</h2>

            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </label>

            <button className="btnPrimary" onClick={loginUser} disabled={isLoading}>
              {isLoading ? "Please wait..." : "Sign In"}
            </button>

            <p className="authSwitch">
              Don&apos;t have an account?{" "}
              <button className="linkBtn" onClick={() => setAuthMode("register")}>
                Create one
              </button>
            </p>
          </div>
        )}

        {!isLoggedIn && authMode === "register" && (
          <div className="card">
            <h2 className="cardTitle">Create your account</h2>

            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password"
              />
            </label>

            <button className="btnPrimary" onClick={registerUser} disabled={isLoading}>
              {isLoading ? "Please wait..." : "Create Account"}
            </button>

            <p className="authSwitch">
              Already have an account?{" "}
              <button className="linkBtn" onClick={() => setAuthMode("login")}>
                Sign in
              </button>
            </p>
          </div>
        )}

        {isLoggedIn && currentStep !== "done" && (
          <div className="card">
            <div className="progressBar">
              <div className="progressFill" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="progressLabel">
              Step {currentStepIndex + 1} of {VISIBLE_STEPS.length}
            </p>

            {currentStep === "profile" && (
              <>
                <h2 className="cardTitle">What should we call you?</h2>
                <label className="field">
                  <span>Full Name</span>
                  <input
                    className="input"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Chidinma Okafor"
                  />
                </label>
                <button className="btnPrimary" onClick={setName} disabled={isLoading}>
                  Continue
                </button>
              </>
            )}

            {currentStep === "banks" && (
              <>
                <h2 className="cardTitle">Which bank do you use?</h2>
                <label className="field">
                  <span>Select your bank</span>
                  <select
                    className="input"
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                  >
                    <option value="">Choose a bank</option>
                    {banks.map((bank) => (
                      <option key={String(bank.id)} value={String(bank.id)}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="btnRow">
                  <button className="btnSecondary" onClick={loadBanks} disabled={isLoading}>
                    Refresh list
                  </button>
                  <button className="btnPrimary" onClick={submitBank} disabled={isLoading}>
                    Continue
                  </button>
                </div>
              </>
            )}

            {currentStep === "email_connect" && (
              <>
                <h2 className="cardTitle">Connect your Gmail</h2>
                <p className="cardDesc">
                  We read your bank alert emails to track your spending automatically.
                </p>
                {!gmailConnectUrl ? (
                  <button className="btnPrimary" onClick={getGmailConnectUrl} disabled={isLoading}>
                    Get Link
                  </button>
                ) : (
                  <>
                    <p className="cardDesc">Click the link below, sign in with Google, and approve access.</p>
                    <a
                      href={gmailConnectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="linkText"
                    >
                      Open Google Sign-In &rarr;
                    </a>
                    <div className="btnRow">
                      <button
                        className="btnSecondary"
                        onClick={openGmailOauth}
                        disabled={isLoading}
                      >
                        Open in new tab
                      </button>
                      <button
                        className="btnPrimary"
                        onClick={advanceFromEmailConnect}
                        disabled={isLoading}
                      >
                        Continue
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {currentStep === "budget" && (
              <>
                <h2 className="cardTitle">Set your monthly budget</h2>
                <p className="cardDesc">
                  We&apos;ll help you stay on track with your spending goals.
                </p>
                <label className="field">
                  <span>Monthly Budget (NGN)</span>
                  <input
                    className="input"
                    type="number"
                    inputMode="numeric"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    placeholder="e.g. 200000"
                  />
                </label>
                <button className="btnPrimary" onClick={submitBudget} disabled={isLoading}>
                  Finish Setup
                </button>
              </>
            )}
          </div>
        )}

        {isLoggedIn && currentStep === "done" && !gmailConnected && (
          <div className="card">
            <h2 className="cardTitle">Connect your email</h2>
            <p className="cardDesc">
              Link your Gmail to start tracking your spending automatically.
            </p>
            {!gmailConnectUrl ? (
              <button className="btnPrimary" onClick={getGmailConnectUrl} disabled={isLoading}>
                {isLoading ? "Please wait..." : "Connect Gmail"}
              </button>
            ) : (
              <>
                <p className="cardDesc">Open the link and approve access to Google.</p>
                <a
                  href={gmailConnectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="linkText"
                >
                  Open Google Sign-In &rarr;
                </a>
                <div className="btnRow">
                  <button
                    className="btnSecondary"
                    onClick={openGmailOauth}
                    disabled={isLoading}
                  >
                    Open in new tab
                  </button>
                  <button
                    className="btnPrimary"
                    onClick={checkGmailConnection}
                    disabled={isLoading}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {isLoggedIn && currentStep === "done" && gmailConnected && (
          <div className="card dashboard">
            <div className="spentCard">
              <p className="spentLabel">Spent this month</p>
              <p className="spentAmount">{koboToNaira(spent)}</p>
              {budget != null && (
                <p className="budgetContext">
                  of {koboToNaira(budget)} budget
                </p>
              )}
            </div>

            <div className="dashboardActions">
              <button
                className="btnGhost"
                onClick={refreshSpendingPace}
                disabled={isLoading}
              >
                Refresh
              </button>
              <button
                className="btnDanger"
                onClick={disconnectGmail}
                disabled={isLoading}
              >
                Disconnect Gmail
              </button>
            </div>
          </div>
        )}

        {statusMessage && (
          <p className="alert success">{statusMessage}</p>
        )}
        {errorMessage && (
          <p className="alert error">{errorMessage}</p>
        )}

        {isLoading && bootingSession && (
          <p className="hint">Loading...</p>
        )}
      </div>

      <style jsx>{`
        .shell {
          min-height: 100vh;
          background: #f5f5f5;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 48px 16px;
        }

        .container {
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .logo {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .btnGhost {
          background: none;
          border: none;
          color: #666;
          font-size: 0.875rem;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 8px;
          transition: background 0.15s;
        }

        .btnGhost:hover {
          background: #e8e8e8;
        }

        .btnGhost:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .card {
          background: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 16px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .cardTitle {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
          line-height: 1.3;
        }

        .cardDesc {
          font-size: 0.875rem;
          color: #666;
          margin: 0;
          line-height: 1.5;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field span {
          font-size: 0.8125rem;
          font-weight: 500;
          color: #333;
        }

        .input {
          width: 100%;
          border: 1px solid #d9d9d9;
          border-radius: 10px;
          background: #ffffff;
          color: #1a1a1a;
          font-size: 0.9375rem;
          padding: 11px 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .input:focus {
          border-color: #1a1a1a;
          box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.08);
        }

        .btnPrimary {
          background: #1a1a1a;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          padding: 13px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
          width: 100%;
        }

        .btnPrimary:hover:not(:disabled) {
          background: #333;
        }

        .btnPrimary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btnSecondary {
          background: #ffffff;
          color: #1a1a1a;
          border: 1px solid #d9d9d9;
          border-radius: 10px;
          padding: 12px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
          width: 100%;
        }

        .btnSecondary:hover:not(:disabled) {
          background: #f5f5f5;
        }

        .btnSecondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btnDanger {
          background: #ffffff;
          color: #c0392b;
          border: 1px solid #e8c5c5;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }

        .btnDanger:hover:not(:disabled) {
          background: #fff5f5;
        }

        .btnDanger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btnRow {
          display: flex;
          gap: 10px;
        }

        .btnRow .btnSecondary,
        .btnRow .btnPrimary {
          flex: 1;
        }

        .authSwitch {
          font-size: 0.875rem;
          color: #666;
          text-align: center;
          margin: 0;
        }

        .linkBtn {
          background: none;
          border: none;
          color: #1a1a1a;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 2px;
          padding: 0;
        }

        .linkBtn:hover {
          color: #444;
        }

        .progressBar {
          width: 100%;
          height: 4px;
          background: #e5e5e5;
          border-radius: 999px;
          overflow: hidden;
        }

        .progressFill {
          height: 100%;
          background: #1a1a1a;
          border-radius: 999px;
          transition: width 0.4s ease;
        }

        .progressLabel {
          font-size: 0.8125rem;
          color: #999;
          margin: 0;
          text-align: center;
        }

        .dashboard {
          gap: 20px;
        }

        .spentCard {
          text-align: center;
          padding: 12px 0;
        }

        .spentLabel {
          font-size: 0.8125rem;
          color: #999;
          margin: 0 0 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .spentAmount {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .budgetContext {
          font-size: 0.875rem;
          color: #888;
          margin: 8px 0 0;
        }

        .dashboardActions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .linkText {
          color: #1a1a1a;
          font-size: 0.9375rem;
          font-weight: 500;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .alert {
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .success {
          background: #f0faf2;
          color: #1a5c2a;
          border: 1px solid #c3e6ca;
        }

        .error {
          background: #fef0f0;
          color: #8b1a1a;
          border: 1px solid #f5c6c6;
        }

        .hint {
          font-size: 0.875rem;
          color: #999;
          text-align: center;
          margin: 0;
        }

        @media (max-width: 480px) {
          .shell {
            padding: 24px 12px;
          }
        }
      `}</style>
    </main>
  );
}
