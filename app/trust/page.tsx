"use client";

/**
 * app/trust/page.tsx
 * Trust & Validation — Phase 4 shell.
 */

import {
  Badge,
  Card,
  SectionHeading,
  EmptyState,
  ComingSoonBanner,
  PageHeader,
} from "@/components/ui";

function ReputationExplainer() {
  const tiers = [
    { tier: "Bronze",   range: "0–24",  color: "#cd7f32" },
    { tier: "Silver",   range: "25–49", color: "#a8a9ad" },
    { tier: "Gold",     range: "50–74", color: "#f59e0b" },
    { tier: "Platinum", range: "75–100",color: "#55D6E8" },
  ];

  return (
    <Card>
      <SectionHeading>ATOM Reputation Engine</SectionHeading>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        The ATOM program on Solana aggregates{" "}
        <code className="code-tag">giveFeedback()</code> transactions into a
        weighted average score with Sybil resistance. Scores map to four trust
        tiers, stored fully on-chain.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {tiers.map((t) => (
          <div
            key={t.tier}
            className="p-3 rounded-md text-center"
            style={{
              background: "var(--bg-elevated)",
              border: `1px solid ${t.color}33`,
            }}
          >
            <div
              className="text-sm font-semibold mb-0.5"
              style={{ color: t.color }}
            >
              {t.tier}
            </div>
            <div className="text-xs text-[var(--text-muted)]">Score {t.range}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Source: ATOM program{" "}
        <code className="code-tag">6Mu7qj6tRDrqchxJJPjr9V1H2XQjCerVKixFEEMwC1Tf</code>{" "}
        (devnet). Trust tiers will be read live via{" "}
        <code className="code-tag">sdk.getSummary()</code> in Phase 2+.
      </p>
    </Card>
  );
}

function FeedbackSchema() {
  const fields = [
    { field: "value",        desc: "Score 0–100 (or custom decimals)", onChain: true },
    { field: "tag1",         desc: "uptime, quality, starred, revenues…", onChain: true },
    { field: "tag2",         desc: "Time period: day, week, month", onChain: true },
    { field: "feedbackUri",  desc: "IPFS pointer to full feedback JSON", onChain: false },
    { field: "sealHash",     desc: "SEAL v1 integrity hash", onChain: true },
    { field: "clientAddress",desc: "Feedback submitter wallet", onChain: true },
  ];

  return (
    <Card>
      <SectionHeading>Feedback Signal Structure</SectionHeading>
      <div className="space-y-2">
        {fields.map((f) => (
          <div
            key={f.field}
            className="flex items-start justify-between gap-3 py-2"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div>
              <code className="code-tag">{f.field}</code>
              <span className="ml-2 text-xs text-[var(--text-muted)]">{f.desc}</span>
            </div>
            <Badge variant={f.onChain ? "green" : "muted"}>
              {f.onChain ? "on-chain" : "off-chain"}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProofPassExplainer() {
  return (
    <Card>
      <SectionHeading>ProofPass — Verified Feedback Flow</SectionHeading>
      <p className="text-sm text-[var(--text-secondary)] mb-3">
        ProofPass ties feedback to a specific task session. The service opens a
        session before the task runs; the reviewer finalises a real{" "}
        <code className="code-tag">giveFeedback()</code> after seeing the result.
        This prevents retroactive cherry-picking of positive reviews.
      </p>
      <div className="space-y-2 text-sm">
        {[
          { step: "1", label: "openProofPass()", desc: "Service wallet opens a session PDA on-chain before task execution." },
          { step: "2", label: "Task executes", desc: "Agent performs the task. Result is returned to the requester." },
          { step: "3", label: "giveFeedbackWithProof()", desc: "Reviewer finalises the score against the session PDA. Feedback is attributed to the reviewer." },
        ].map((s) => (
          <div key={s.step} className="flex gap-3">
            <span
              style={{
                width: 22, height: 22, borderRadius: "50%",
                background: "rgba(124,140,255,0.12)",
                border: "1px solid rgba(124,140,255,0.3)",
                color: "var(--accent-indigo)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.6875rem", fontWeight: 700, flexShrink: 0,
              }}
            >{s.step}</span>
            <div>
              <code className="code-tag">{s.label}</code>
              <span className="ml-2 text-xs text-[var(--text-muted)]">{s.desc}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-3">
        Will be implemented in Phase 4 using{" "}
        <code className="code-tag">openProofPass</code> and{" "}
        <code className="code-tag">giveFeedbackWithProof</code> from the{" "}
        <code className="code-tag">8004-solana</code> SDK.
      </p>
    </Card>
  );
}

export default function TrustPage() {
  return (
    <div className="page-content">
      <PageHeader
        title="Trust & Validation"
        description="Inspect on-chain reputation, ATOM trust tiers, and ProofPass verified feedback records for registered agents."
        actions={<Badge variant="violet">Phase 4</Badge>}
      />

      <ComingSoonBanner
        phase={4}
        label="Live reputation queries and feedback submission will be implemented in Phase 4. The explainers below document how the on-chain system works."
      />

      <div className="space-y-5">
        <div>
          <SectionHeading>Agent Reputation</SectionHeading>
          <EmptyState
            icon={
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M8 2L10 5h3.5L11 7.5l1 3.5L8 9l-4 2 1-3.5L2.5 5H6L8 2z" strokeLinejoin="round" />
              </svg>
            }
            title="No reputation data yet"
            subtitle="Register agents in Phase 2 and delegate tasks in Phase 3. ATOM scores will appear here after feedback transactions are submitted."
          />
        </div>

        <ReputationExplainer />
        <FeedbackSchema />
        <ProofPassExplainer />
      </div>
    </div>
  );
}
