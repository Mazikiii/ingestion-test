"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api, { handleApiResponse, markPinSetupCompleted, setTokens } from "@/lib/api";
import { authApi, getAccessToken, getAuthRedirectPath } from "@/lib/auth";

type OnboardingStep = "profile" | "budget" | "bank" | "email_connect" | "set_pin" | "done";

type Profile = {
  full_name?: string;
  age_group?: string;
  life_stage?: string;
  language?: string;
  onboarding_step?: string;
  onboarding_completed?: boolean;
};

type Bank = {
  id: string;
  name: string;
};

const STEPS: OnboardingStep[] = ["profile", "budget", "bank", "email_connect", "set_pin"];

const AGE_GROUPS = [
  { value: "18-24", label: "18-24" },
  { value: "25-34", label: "25-34" },
  { value: "35-44", label: "35-44" },
  { value: "45-54", label: "45-54" },
  { value: "55-64", label: "55-64" },
  { value: "65+", label: "65+" },
];

const LIFE_STAGES = [
  { value: "student", label: "Student" },
  { value: "nysc_corper", label: "NYSC Corper" },
  { value: "freelancer", label: "Freelancer" },
  { value: "salary_worker", label: "Salary Worker" },
  { value: "Unemployed", label: "Unemployed" },
  { value: "graduate", label: "Graduate" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [gmailUrl, setGmailUrl] = useState("");
  const [gmailConnected, setGmailConnected] = useState(false);
  const [error, setError] = useState("");
  
  // Form state
  const [fullName, setFullName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [lifeStage, setLifeStage] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const normalizeStep = (raw?: string): OnboardingStep => {
    if (!raw || raw === "language") return "profile";
    if (raw === "banks") return "bank";
    if (raw === "bank") return "bank";
    if (raw === "done") return "set_pin";
    if (raw === "set_pin") return "set_pin";
    if (raw === "profile" || raw === "budget" || raw === "bank" || raw === "email_connect") {
      return raw;
    }
    return "profile";
  };

  const advanceStep = async (): Promise<Profile> => {
    const res = await api.patch("/profile", { advance_step: true });
    const data = await handleApiResponse<{ profile: Profile }>(res);
    return data.profile;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, banksRes, gmailStatusRes] = await Promise.all([
        api.get("/profile"),
        api.get("/banks"),
        api.get("/ingestion/gmail/status"),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        const nextProfile: Profile = data.profile;
        setProfile(nextProfile);
        if (nextProfile.full_name) setFullName(nextProfile.full_name);
        if (nextProfile.age_group) setAgeGroup(nextProfile.age_group);
        if (nextProfile.life_stage) setLifeStage(nextProfile.life_stage);

        if (!nextProfile.language) {
          const languageRes = await api.patch("/profile", { language: "en" });
          if (languageRes.ok) {
            const languageData = await languageRes.json();
            setProfile(languageData.profile);
          }
        }
      }

      if (banksRes.ok) {
        const banksData = await banksRes.json();
        setBanks(Array.isArray(banksData) ? banksData : banksData.banks || []);
      }

      if (gmailStatusRes.ok) {
        const gmailStatus = await gmailStatusRes.json();
        setGmailConnected(Boolean(gmailStatus.connected));
      }
    } catch (e) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStep = (): OnboardingStep => {
    return normalizeStep(profile?.onboarding_step);
  };

  const currentStep = getCurrentStep();
  const currentIndex = STEPS.indexOf(currentStep);
  const progress = Math.round((currentIndex / STEPS.length) * 100);

  const handleProfileSubmit = async () => {
    if (!fullName.trim()) {
      setError("Enter your name");
      return;
    }
    if (!ageGroup) {
      setError("Select age group");
      return;
    }
    if (!lifeStage) {
      setError("Select life stage");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.patch("/profile", {
        full_name: fullName.trim(),
        age_group: ageGroup,
        life_stage: lifeStage,
      });
      const data = await handleApiResponse<{ profile: Profile }>(res);
      let nextProfile = data.profile;

      if (normalizeStep(nextProfile.onboarding_step) === "profile") {
        nextProfile = await advanceStep();
      }

      setProfile(nextProfile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetSubmit = async () => {
    const amount = Number(budget);
    if (!amount || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/onboarding/budget", { monthly_budget_naira: amount });
      await handleApiResponse(res);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set budget");
    } finally {
      setLoading(false);
    }
  };

  const handleBankSubmit = async () => {
    if (!selectedBankId) {
      setError("Select your bank");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/onboarding/bank", { bank_id: selectedBankId });
      await handleApiResponse(res);
      await loadData();
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
      setGmailConnected(data.connected);
      if (data.connected) {
        try {
          await advanceStep();
        } catch {
          // Some backends auto-advance when gmail is connected
        }
        await loadData();
      } else {
        setError("Gmail is not connected yet. Complete Google consent and try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to check Gmail status");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPinSubmit = async () => {
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
      const accessToken = getAccessToken();
      const data = await authApi.setPin(pin, confirmPin, accessToken ?? undefined);
      setTokens(data.accessToken, data.refreshToken);
      markPinSetupCompleted();
      const redirectPath = getAuthRedirectPath(data.registrationStatus);
      router.push(redirectPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set PIN");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ marginBottom: 24 }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.max(progress, 5)}%` }} />
        </div>
        <p style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 8, textAlign: "center" }}>
          Step {Math.min(currentIndex + 1, STEPS.length)} of {STEPS.length}
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      {currentStep === "profile" && (
        <div className="card">
          <h2 className="title">Tell us about yourself</h2>
          <p className="subtitle">This helps us personalize your experience</p>

          <div className="form-group">
            <label className="label">Full Name</label>
            <input
              className="input"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div className="form-group">
            <label className="label">Age Group</label>
            <select className="select" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
              <option value="">Select age group</option>
              {AGE_GROUPS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Life Stage</label>
            <select className="select" value={lifeStage} onChange={(e) => setLifeStage(e.target.value)}>
              <option value="">Select life stage</option>
              {LIFE_STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <button 
            className="btn btn-primary btn-full" 
            onClick={handleProfileSubmit} 
            disabled={loading || !fullName.trim() || !ageGroup || !lifeStage}
          >
            {loading ? "Please wait..." : "Continue"}
          </button>
        </div>
      )}

      {currentStep === "budget" && (
        <div className="card">
          <h2 className="title">Set your monthly budget</h2>
          <p className="subtitle">We&apos;ll help you stay on track</p>

          <div className="form-group">
            <label className="label">Monthly Budget (Naira)</label>
            <input
              className="input"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 100000"
            />
          </div>

          <button 
            className="btn btn-primary btn-full" 
            onClick={handleBudgetSubmit} 
            disabled={loading || !budget || Number(budget) <= 0}
          >
            {loading ? "Please wait..." : "Continue"}
          </button>
        </div>
      )}

      {currentStep === "bank" && (
        <div className="card">
          <h2 className="title">Select your bank</h2>
          <p className="subtitle">Which bank do you use?</p>

          <div className="form-group">
            <select 
              className="select" 
              value={selectedBankId} 
              onChange={(e) => setSelectedBankId(e.target.value)}
              disabled={loading}
            >
              <option value="">Select your bank</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </select>
          </div>

          <button 
            className="btn btn-primary btn-full" 
            onClick={handleBankSubmit} 
            disabled={loading || !selectedBankId}
          >
            {loading ? "Please wait..." : "Continue"}
          </button>
        </div>
      )}

      {currentStep === "email_connect" && (
        <div className="card">
          <h2 className="title">Connect your Gmail</h2>
          <p className="subtitle">We read your bank alert emails to track spending</p>

          {gmailConnected && (
            <p className="success" style={{ marginBottom: 12 }}>Gmail connected successfully.</p>
          )}

          {!gmailUrl ? (
            <button className="btn btn-primary btn-full" onClick={handleGetGmailLink} disabled={loading}>
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
        </div>
      )}

      {currentStep === "set_pin" && (
        <div className="card">
          <h2 className="title">Create your PIN</h2>
          <p className="subtitle">This PIN will be used to access your account</p>

          <div className="form-group">
            <label className="label">4-digit PIN</label>
            <input
              className="input"
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4 digits"
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
              placeholder="4 digits"
            />
          </div>

          <button 
            className="btn btn-primary btn-full" 
            onClick={handleSetPinSubmit} 
            disabled={loading || pin.length !== 4 || confirmPin.length !== 4 || pin !== confirmPin}
          >
            {loading ? "Please wait..." : "Complete Setup"}
          </button>
        </div>
      )}

    </div>
  );
}
