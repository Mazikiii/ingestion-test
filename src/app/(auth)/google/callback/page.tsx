"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setTokens } from "@/lib/api";

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

    console.log("Google callback params:", { accessToken: !!accessToken, refreshToken: !!refreshToken, isNewUser });

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      if (isNewUser === "true") {
        router.push("/onboarding");
      } else {
        router.push("/");
      }
    } else {
      setError("No tokens received. Please try again.");
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