"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/activities", label: "Activities" },
  { href: "/insights", label: "Insights" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

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