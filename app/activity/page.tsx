"use client";

/**
 * app/activity/page.tsx
 * Activity Logs — Phase 4 shell. No fabricated entries.
 */

import {
  Badge,
  Card,
  SectionHeading,
  EmptyState,
  ComingSoonBanner,
  PageHeader,
} from "@/components/ui";

const PLANNED_EVENT_TYPES = [
  { type: "registry_query",     label: "Registry Query",      color: "var(--accent-blue)",   desc: "Agent identity lookup via 8004-solana SDK" },
  { type: "agent_registration", label: "Agent Registration",  color: "var(--accent-cyan)",   desc: "Metaplex Core NFT mint + IPFS metadata upload" },
  { type: "agent_selected",     label: "Agent Selected",      color: "var(--accent-violet)", desc: "Orchestrator selected agent based on reputation + skill" },
  { type: "task_delegated",     label: "Task Delegated",      color: "var(--accent-amber)",  desc: "Task sent to agent A2A / MCP endpoint" },
  { type: "feedback_submitted", label: "Feedback Submitted",  color: "var(--accent-green)",  desc: "giveFeedback() / ProofPass written on-chain" },
  { type: "validation_failed",  label: "Validation Failed",   color: "var(--accent-red)",    desc: "Result did not pass quality threshold" },
];

function EventTypeLegend() {
  return (
    <Card>
      <SectionHeading>Planned Event Types</SectionHeading>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        The activity log will record the following event types once the
        corresponding phases are implemented. Events are application-level
        records; on-chain transactions will include Solana Explorer links.
      </p>
      <div className="space-y-1">
        {PLANNED_EVENT_TYPES.map((e) => (
          <div
            key={e.type}
            className="flex items-start gap-3 py-2.5"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <span
              className="dot"
              style={{ background: e.color, marginTop: 5, flexShrink: 0 }}
            />
            <div>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {e.label}
              </span>
              <span
                className="mx-2 text-xs text-[var(--text-muted)]"
                style={{ fontFamily: "var(--font-geist-mono)" }}
              >
                {e.type}
              </span>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{e.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LogShell() {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <SectionHeading>Event Log</SectionHeading>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="btn btn-secondary btn-sm"
            style={{ opacity: 0.4, cursor: "not-allowed" }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 4h12M4 8h8M6 12h4" strokeLinecap="round" />
            </svg>
            Filter
          </button>
          <button
            disabled
            className="btn btn-secondary btn-sm"
            style={{ opacity: 0.4, cursor: "not-allowed" }}
          >
            Export
          </button>
        </div>
      </div>

      <EmptyState
        icon={
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M2 8h2l2-5 3 9 2-4h3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
        title="No events recorded yet"
        subtitle="Activity will appear here as each phase is implemented. The first entries will be agent registration events from Phase 2."
      />
    </Card>
  );
}

export default function ActivityPage() {
  return (
    <div className="page-content">
      <PageHeader
        title="Activity Logs"
        description="A real-time record of registry queries, agent selection, task delegation, validation results, and on-chain feedback transactions."
        actions={<Badge variant="violet">Phase 4</Badge>}
      />

      <ComingSoonBanner
        phase={2}
        label="The first activity entries will appear when agent registration is implemented in Phase 2."
      />

      <div className="space-y-5">
        <LogShell />
        <EventTypeLegend />
      </div>
    </div>
  );
}
