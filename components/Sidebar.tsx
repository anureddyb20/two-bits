"use client";

/**
 * components/Sidebar.tsx
 * Persistent navigation sidebar. All icons are inline SVG — no icon library needed.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------
const Icons = {
  overview: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  ),
  agents: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="5" r="2.5" />
      <path d="M2.5 13.5c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5" strokeLinecap="round" />
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M5 8h6M5 5.5h4M5 10.5h3" strokeLinecap="round" />
    </svg>
  ),
  trust: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2L10 5h3.5L11 7.5l1 3.5L8 9l-4 2 1-3.5L2.5 5H6L8 2z" strokeLinejoin="round" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 8h2l2-5 3 9 2-4h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  technical: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 4L2 8l3 4M11 4l3 4-3 4M9 3l-2 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  ),
  feedback: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 3.5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6.5l-3.5 2.5v-2.5h-1a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z" strokeLinejoin="round" />
      <path d="M6 7.5l1.5 1.5 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  solana: (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 11.5h8.5l1.5-1.5H4.5L3 11.5zm0-3.5h8.5L13 6.5H4.5L3 8zM4.5 4.5L3 6H13L11.5 4.5H4.5z" opacity=".8"/>
    </svg>
  ),
};

const NAV_ITEMS = [
  { href: "/",                label: "Overview",         icon: Icons.overview  },
  { href: "/agent-registry",  label: "Agent Registry",   icon: Icons.agents,  phase: 2 },
  { href: "/task-center",     label: "Task Center",      icon: Icons.tasks,   phase: 3 },
  { href: "/feedback",        label: "Feedback Hub",     icon: Icons.feedback, phase: 4 },
  { href: "/trust",           label: "Trust & Validation", icon: Icons.trust, phase: 4 },
  { href: "/activity",        label: "Activity Logs",    icon: Icons.activity, phase: 4 },
  { href: "/technical",       label: "Technical Details", icon: Icons.technical },
];

// ---------------------------------------------------------------------------
// Connectivity pill for sidebar footer
// ---------------------------------------------------------------------------
function ConnectivityPill() {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");
  const [slot, setSlot] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        setStatus(d.ok ? "ok" : "error");
        if (d.currentSlot) setSlot(d.currentSlot);
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
          <span style={{ color: "var(--accent-indigo)", display: "flex" }}>{Icons.solana}</span>
          Solana Devnet
        </div>
        <span
          className={`badge ${
            status === "ok"
              ? "badge-green"
              : status === "error"
              ? "badge-red"
              : "badge-amber"
          }`}
        >
          {status === "ok" ? "Live" : status === "error" ? "Offline" : "…"}
        </span>
      </div>
      {slot !== null && (
        <p className="text-[11px] text-[var(--text-muted)] font-mono">
          slot {slot.toLocaleString()}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Sidebar
// ---------------------------------------------------------------------------
export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile menu button — rendered in topbar slot via portal-less approach:
          the Sidebar renders its own mobile toggle absolutely positioned. */}
      <button
        className="mobile-menu-btn fixed top-3 left-3 z-50 md:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? Icons.close : Icons.menu}
      </button>

      {/* Backdrop */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? "visible" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">2B</div>
          <div>
            <div className="sidebar-logo-text">TWO BITS</div>
            <div className="sidebar-logo-sub">AI Agent Network</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="sidebar-section-label">Navigation</p>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item.href) ? "active" : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.phase && !isActive(item.href) && (
                <span className="nav-item-phase">P{item.phase}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <ConnectivityPill />
        </div>
      </aside>
    </>
  );
}
