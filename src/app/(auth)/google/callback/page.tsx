"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, Suspense } from "next/navigation";
import api from "@/lib/api";

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>Loading...</div>}>
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
    const isNewUser = searchParams.get("isNewUser");

    if (accessToken && refreshToken) {
      api.setTokens(accessToken, refreshToken);
      if (isNewUser === "true") {
        router.push("/onboarding");
      } else {
        router.push("/");
      }
    } else {
      setError("No tokens received");
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: 16 }}>
        <p className="error">{error}</p>
        <a href="/login" className="link">Back to login</a>
      </div>
    );
  }

  return (
    <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div>Completing sign in...</div>
    </div>
  );
}