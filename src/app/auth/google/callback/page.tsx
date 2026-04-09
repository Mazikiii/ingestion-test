"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { markPinSetupRequired, setTokens } from "@/lib/api";
import { getAuthRedirectPath } from "@/lib/auth";

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          className="container"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}
        >
          Loading...
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const registrationStatus = searchParams.get("registrationStatus") as "not_verified" | "no_profile" | "onboarding_incomplete" | "pin_not_set" | "complete" | null;

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      const redirectPath = getAuthRedirectPath(registrationStatus || undefined);
      if (registrationStatus === "not_verified") {
        markPinSetupRequired();
        router.replace("/register");
      } else if (registrationStatus === "pin_not_set" || registrationStatus === "onboarding_incomplete") {
        markPinSetupRequired();
        router.replace(redirectPath);
      } else {
        router.replace(redirectPath);
      }
      return;
    }

    setError("No tokens received. Please try again.");
  }, [router, searchParams]);

  if (error) {
    return (
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <p className="error">{error}</p>
        <a href="/login" className="link">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}
    >
      <div>Completing sign in...</div>
    </div>
  );
}
