"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import api from "@/lib/api";

const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/activities", label: "Activities" },
  { href: "/insights", label: "Insights" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function guard() {
      const token = api.getAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await api.get("/profile").catch(() => null);
      if (!res || !res.ok) {
        if (!cancelled) router.replace("/login");
      }
    }

    void guard();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="container">
      <div className="page">{children}</div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? "active" : ""}`}
          >
            <span className="nav-icon">{pathname === item.href ? "●" : "○"}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <style jsx>{`
        .page {
          padding-bottom: 80px;
        }
      `}</style>
    </div>
  );
}
