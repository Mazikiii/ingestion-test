"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type OnboardingStep = "profile" | "budget" | "bank" | "email_connect" | "set_pin" | "done";

type Profile = {
  full_name?: string;
  age_group?: string;
  life_stage?: string;
  onboarding_step?: string;
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
  { value: "salary_worker", label: "Salary Worker" },
  { value: "business_owner", label: "Business Owner" },
  { value: "freelancer", label: "Freelancer" },
  { value: "unemployed", label: "Unemployed" },
  { value: "retired", label: "Retired" },
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, banksRes] = await Promise.all([
        api.get("/profile"),
        api.get("/banks"),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile);
      }

      if (banksRes.ok) {
        setBanks(await banksRes.json());
      }
    } catch (e) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStep = (): OnboardingStep => {
    if (!profile) return "profile";
    const step = profile.onboarding_step || "profile";
    if (step === "done") return "profile";
    if (!STEPS.includes(step as OnboardingStep)) return "profile";
    return step as OnboardingStep;
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
      const res = await api.patch("/profile", { full_name: fullName.trim(), age_group: ageGroup, life_stage: lifeStage });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to save");
        return;
      }
      const data = await res.json();
      setProfile(data.profile);
    } catch (e) {
      setError("Something went wrong");
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
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to set budget");
        return;
      }
      const data = await res.json();
      setProfile(data.profile);
    } catch (e) {
      setError("Something went wrong");
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
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to save bank");
        return;
      }
      await loadData();
    } catch (e) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGetGmailLink = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/ingestion/gmail/connect");
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to get link");
        return;
      }
      const data = await res.json();
      setGmailUrl(data.url);
    } catch (e) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckGmailStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/ingestion/gmail/status");
      if (res.ok) {
        const data = await res.json();
        setGmailConnected(data.connected);
        if (data.connected) {
          const profileRes = await api.patch("/profile", { advance_step: true });
          if (profileRes.ok) {
            const data = await profileRes.json();
            setProfile(data.profile);
          }
        }
      }
    } catch (e) {
      setError("Failed to check status");
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
      const res = await api.post("/auth/pin", { pin, confirmPin });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to set PIN");
        return;
      }
      const data = await res.json();
      api.setTokens(data.accessToken, data.refreshToken);
      router.push("/home");
    } catch (e) {
      setError("Something went wrong");
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
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p style={{ fontSize: 12, color: "var(--gray-500)", marginTop: 8, textAlign: "center" }}>
          Step {currentIndex + 1} of {STEPS.length}
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

          <button className="btn btn-primary btn-full" onClick={handleProfileSubmit} disabled={loading}>
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

          <button className="btn btn-primary btn-full" onClick={handleBudgetSubmit} disabled={loading}>
            {loading ? "Please wait..." : "Continue"}
          </button>
        </div>
      )}

      {currentStep === "bank" && (
        <div className="card">
          <h2 className="title">Select your bank</h2>
          <p className="subtitle">Which bank do you use?</p>

          <div className="form-group">
            <select className="select" value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)}>
              <option value="">Select your bank</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary btn-full" onClick={handleBankSubmit} disabled={loading}>
            {loading ? "Please wait..." : "Continue"}
          </button>
        </div>
      )}

      {currentStep === "email_connect" && (
        <div className="card">
          <h2 className="title">Connect your Gmail</h2>
          <p className="subtitle">We read your bank alert emails to track spending</p>

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
              <button className="btn btn-primary btn-full" onClick={handleCheckGmailStatus} disabled={loading}>
                {loading ? "Checking..." : "I've Connected - Continue"}
              </button>
            </>
          )}
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

          <button className="btn btn-primary btn-full" onClick={handleSetPinSubmit} disabled={loading}>
            {loading ? "Please wait..." : "Complete Setup"}
          </button>
        </div>
      )}

      <style jsx>{`
        .progress-bar {
          width: 100%;
          height: 4px;
          background: var(--gray-200);
          border-radius: 999px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--foreground);
          border-radius: 999px;
          transition: width 0.3s ease;
        }
      `}</style>
    </div>
  );
}