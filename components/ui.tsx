"use client";

/**
 * components/ui.tsx
 * Shared design primitives — no third-party UI library required.
 */

import React from "react";

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
type BadgeVariant = "blue" | "cyan" | "green" | "amber" | "red" | "violet" | "muted" | "outline";

export function Badge({
  children,
  variant = "muted",
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span className={`badge badge-${variant} ${className}`}>{children}</span>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function Card({
  children,
  className = "",
  padding = "p-5",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div className={`card ${padding} ${className}`}>{children}</div>
  );
}

export function CardInner({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`card-inner p-4 ${className}`}>{children}</div>;
}

// ---------------------------------------------------------------------------
// SectionHeading
// ---------------------------------------------------------------------------
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <p className="section-heading">{children}</p>;
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------
export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`divider ${className}`} />;
}

// ---------------------------------------------------------------------------
// DataRow — key/value mono display
// ---------------------------------------------------------------------------
export function DataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="data-row">
      <span className="data-row-key">{label}</span>
      <span className="data-row-value">{children}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <p className="empty-title">{title}</p>
      <p className="empty-subtitle">{subtitle}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComingSoonBanner
// ---------------------------------------------------------------------------
export function ComingSoonBanner({
  phase,
  label,
}: {
  phase: number;
  label: string;
}) {
  return (
    <div className="coming-soon-banner">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span>
        <strong>Phase {phase}:</strong> {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------------
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-7 flex-wrap sm:flex-nowrap">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1.5">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-shrink-0 mt-1 sm:mt-0">{actions}</div>}
    </div>
  );
}
