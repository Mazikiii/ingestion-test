"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";

export default function HomePage() {
  const { isChecking, isAuthenticated, onboardingCompleted } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isChecking) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (onboardingCompleted === false) {
        router.push("/onboarding");
      } else {
        router.push("/home");
      }
    }
  }, [isChecking, isAuthenticated, onboardingCompleted, router]);

  return (
    <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div>Loading...</div>
    </div>
  );
}