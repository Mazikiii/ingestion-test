"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api, { hasPendingPinSetup } from "./api";

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

let lastActivity = Date.now();

function updateActivity() {
  lastActivity = Date.now();
}

function checkSessionTimeout(): boolean {
  return Date.now() - lastActivity > SESSION_TIMEOUT_MS;
}

export function useSession() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  const checkSession = useCallback(async () => {
    if (checkSessionTimeout()) {
      api.clearTokens();
      setIsAuthenticated(false);
      setIsChecking(false);
      return;
    }

    const accessToken = await api.getAccessToken();
    if (!accessToken) {
      setIsAuthenticated(false);
      setIsChecking(false);
      return;
    }

    try {
      const res = await api.get("/profile");
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        const completed = data.profile?.onboarding_completed ?? false;
        if (completed && hasPendingPinSetup()) {
          setOnboardingCompleted(false);
        } else {
          setOnboardingCompleted(completed);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }

    setIsChecking(false);
  }, []);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, updateActivity));

    checkSession();

    const interval = setInterval(() => {
      if (checkSessionTimeout()) {
        api.clearTokens();
        setIsAuthenticated(false);
        router.push("/login");
      }
    }, 60000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [checkSession, router]);

  const logout = useCallback(() => {
    api.clearTokens();
    setIsAuthenticated(false);
    router.push("/login");
  }, [router]);

  return { isChecking, isAuthenticated, onboardingCompleted, logout };
}

export function useApi() {
  return api;
}
