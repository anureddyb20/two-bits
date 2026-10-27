"use client";

export const dynamic = "force-dynamic";

/**
 * app/agent-registry/page.tsx  —  Phase 2B
 *
 * Left column  : registration panel for the real on-chain coordinator agent.
 * Right column : agent roster — real registered agent + 3 mock specialist
 *                agents (clearly labelled "Mock · Demo data").
 *
 * Nothing in the mock cards is invented as on-chain truth.
 * Scores, feedback counts, and trust tiers are marked "demo data" in the UI.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Card,
  SectionHeading,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import type { MockAgentDisplay } from "@/lib/agentDefs";

// ---------------------------------------------------------------------------
// Static mock data — imported from agentDefs so it stays a single source
// of truth. We can't import server-only modules in a client component, so
// we duplicate the display-only shape here and keep the canonical definition
// in lib/agentDefs.ts for the server side.
// ---------------------------------------------------------------------------

const MOCK_AGENTS: MockAgentDisplay[] = [
  {
    id: "mock-summarizer",
    name: "Text Summarizer",
    emoji: "📝",
    gradient: "linear-gradient(135deg, #0ea5e9, #6366f1)",
    description:
      "Condenses long documents, research papers, and articles into clear, " +
      "structured summaries. Specialises in extracting key findings and action items.",
    capabilities: ["text summarization", "key extraction", "report generation", "NLP"],
    skill: "natural_language_processing/text_generation/text_generation",
    domain: "technology/software_engineering/software_engineering",
    mockScore: 91,
    mockFeedbacks: 47,
    trustTier: "Gold",
  },
  {
    id: "mock-code-reviewer",
    name: "Code Reviewer",
    emoji: "🔍",
    gradient: "linear-gradient(135deg, #10b981, #3b82f6)",
    description:
      "Reviews code for correctness, security vulnerabilities, and best-practice " +
      "violations. Supports TypeScript, Rust, Python, and Solana programs.",
    capabilities: ["code review", "security analysis", "refactoring", "Solana programs"],
    skill: "natural_language_processing/text_generation/text_generation",
    domain: "technology/software_engineering/software_engineering",
    mockScore: 88,
    mockFeedbacks: 34,
    trustTier: "Silver",
  },
  {
    id: "mock-data-analyzer",
    name: "Data Analyzer",
    emoji: "📊",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    description:
      "Processes structured and unstructured datasets, identifies patterns and " +
      "anomalies, and produces actionable insights with supporting charts.",
    capabilities: ["data analysis", "anomaly detection", "pattern recognition", "reporting"],
    skill: "natural_language_processing/text_generation/text_generation",
    domain: "technology/software_engineering/software_engineering",
    mockScore: 85,
    mockFeedbacks: 29,
    trustTier: "Silver",
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfigStatus {
  signerConfigured: boolean;
  ipfsConfigured: boolean;
  cluster: string;
}

interface RegistrationRecord {
  agentId: string;
  asset: string;
  signature: string;
  registeredAt: string;
  cluster: string;
}

interface RegisteredApiResponse {
  ok: boolean;
  config: ConfigStatus;
  records: RegistrationRecord[];
  liveData: Record<string, {
    nft_name?: string;
    owner?: string;
    agent_uri?: string;
    atom_enabled?: boolean;
    collection?: string;
    error?: string;
  }> | null;
}

interface RegisterApiResponse {
  ok: boolean;
  alreadyRegistered?: boolean;
  agentId?: string;
  agentLocalId?: string;
  signature?: string;
  metadataUri?: string;
  explorerUrl?: string;
  txExplorerUrl?: string;
  registeredAt?: string;
  error?: string;
  code?: string;
  message?: string;
}

type RegistrationState =
  | { phase: "idle" }
  | { phase: "loading_config" }
  | { phase: "ready"; config: ConfigStatus; records: RegistrationRecord[] }
  | { phase: "confirming"; config: ConfigStatus; records: RegistrationRecord[] }
  | { phase: "registering" }
  | { phase: "success"; result: RegisterApiResponse }
  | { phase: "error"; message: string; code?: string };

// ---------------------------------------------------------------------------
// Tier helpers
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<string, string> = {
  Bronze:   "#cd7f32",
  Silver:   "#a8a9ad",
  Gold:     "#f59e0b",
  Platinum: "#60a5fa",
};

function ScoreBar({ score }: { score: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 2,
          background: "var(--bg-elevated)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            borderRadius: 2,
            background:
              score >= 90
                ? "var(--accent-green)"
                : score >= 75
                ? "var(--accent-blue)"
                : "var(--accent-amber)",
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "0.6875rem",
          fontWeight: 700,
          color:
            score >= 90
              ? "var(--accent-green)"
              : score >= 75
              ? "var(--accent-blue)"
              : "var(--accent-amber)",
          minWidth: 28,
          textAlign: "right",
        }}
      >
        {score}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mock agent card — clearly labeled "Mock · Demo data"
// ---------------------------------------------------------------------------

function MockAgentCard({ agent }: { agent: MockAgentDisplay }) {
  const tierColor = TIER_COLORS[agent.trustTier] ?? "var(--text-muted)";

  return (
    <div
      className="card p-4"
      style={{ border: "1px solid var(--border-subtle)", position: "relative" }}
    >
      {/* Mock watermark badge */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          display: "flex",
          gap: 4,
        }}
      >
        <span className="badge badge-violet" style={{ fontSize: "0.75rem", letterSpacing: "0.03em" }}>
          Mock
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 9,
            background: agent.gradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {agent.emoji}
        </div>
        <div style={{ minWidth: 0 }}>
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {agent.name}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Demo specialist agent
          </p>
        </div>
      </div>

      {/* Description */}
      <p
        className="text-xs text-[var(--text-secondary)] mb-3"
        style={{ lineHeight: 1.5 }}
      >
        {agent.description}
      </p>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {agent.capabilities.map((c) => (
          <span key={c} className="badge badge-blue">
            {c}
          </span>
        ))}
      </div>

      {/* Mock reputation — clearly labeled */}
      <div
        className="p-2 rounded"
        style={{
          background: "var(--bg-base)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Reputation · Demo data
          </span>
          <span
            className="text-xs font-bold"
            style={{ color: tierColor }}
          >
            {agent.trustTier}
          </span>
        </div>
        <ScoreBar score={agent.mockScore} />
        <p className="text-xs text-[var(--text-muted)] mt-1">
          {agent.mockFeedbacks} mock feedbacks · score not on-chain
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Real registered agent card
// ---------------------------------------------------------------------------

function RegisteredAgentCard({ record }: { record: RegistrationRecord }) {
  return (
    <div
      className="card p-4"
      style={{ border: "1px solid rgba(16,185,129,0.25)", position: "relative" }}
    >
      {/* Real on-chain badge */}
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}>
        <span className="badge badge-green">On-chain</span>
        <span className="badge badge-amber">{record.cluster}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 9,
            background: "linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          🤖
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            AHN Coordinator
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            ID: <code className="code-tag">{record.agentId}</code>
          </p>
        </div>
      </div>

      <p className="text-xs text-[var(--text-secondary)] mb-3" style={{ lineHeight: 1.5 }}>
        Coordinates task discovery, specialist selection, and delegated work in the
        Autonomous Agent Hiring &amp; Delegation Network.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {["task analysis", "specialist discovery", "agent selection", "delegation"].map((c) => (
          <span key={c} className="badge badge-blue">{c}</span>
        ))}
      </div>

      {/* On-chain data */}
      <div
        className="p-2 rounded"
        style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}
      >
        <p
          className="text-xs font-semibold mb-1.5"
          style={{ color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          On-chain identity
        </p>
        <div className="data-row">
          <span className="data-row-key">asset</span>
          <span
            className="data-row-value"
            style={{ wordBreak: "break-all", fontSize: "0.625rem", color: "var(--accent-green)" }}
          >
            {record.asset}
          </span>
        </div>
        <div className="data-row">
          <span className="data-row-key">registered</span>
          <span className="data-row-value" style={{ fontSize: "0.6875rem" }}>
            {new Date(record.registeredAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <a
          href={`https://explorer.solana.com/address/${record.asset}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm"
          style={{ fontSize: "0.75rem" }}
        >
          View on Explorer ↗
        </a>
        <a
          href={`https://explorer.solana.com/tx/${record.signature}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm"
          style={{ fontSize: "0.75rem" }}
        >
          View Tx ↗
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Configuration panel
// ---------------------------------------------------------------------------

function ConfigPanel({ config }: { config: ConfigStatus }) {
  const items = [
    {
      label: "Signer keypair",
      ok: config.signerConfigured,
      okText: "Configured",
      failText: "SOLANA_PRIVATE_KEY missing — add to .env.local",
    },
    {
      label: "IPFS / Pinata",
      ok: config.ipfsConfigured,
      okText: "Configured",
      failText: "PINATA_JWT missing — add to .env.local",
    },
    {
      label: "Network",
      ok: true,
      okText: config.cluster,
      failText: "",
    },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between py-2"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
          <div className="flex items-center gap-2">
            <span className={`dot ${item.ok ? "dot-green" : "dot-red"}`} />
            <span
              className="text-xs"
              style={{ color: item.ok ? "var(--accent-green)" : "var(--accent-red)" }}
            >
              {item.ok ? item.okText : item.failText}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent preview (coordinator — static)
// ---------------------------------------------------------------------------

function AgentPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          🤖
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">AHN Coordinator</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            ID: <code className="code-tag">coordinator</code>
          </p>
        </div>
      </div>

      <p className="text-sm text-[var(--text-secondary)]">
        Coordinates task discovery, specialist selection, and delegated work in
        the Autonomous Agent Hiring &amp; Delegation Network.
      </p>

      <div>
        <p className="text-xs text-[var(--text-muted)] mb-1.5">Capabilities</p>
        <div className="flex flex-wrap gap-1.5">
          {["task analysis", "specialist discovery", "agent selection", "delegation coordination"].map(
            (cap) => <Badge key={cap} variant="blue">{cap}</Badge>
          )}
        </div>
      </div>

      <div className="mono-block text-xs space-y-0">
        <div className="data-row"><span className="data-row-key">service</span><span className="data-row-value">A2A</span></div>
        <div className="data-row"><span className="data-row-key">skills</span><span className="data-row-value">natural_language_processing/text_generation</span></div>
        <div className="data-row"><span className="data-row-key">domain</span><span className="data-row-value">technology/software_engineering</span></div>
        <div className="data-row"><span className="data-row-key">active</span><span className="data-row-value" style={{ color: "var(--accent-amber)" }}>false (no live endpoint yet)</span></div>
        <div className="data-row"><span className="data-row-key">ATOM</span><span className="data-row-value" style={{ color: "var(--accent-amber)" }}>disabled (can enable later)</span></div>
        <div className="data-row"><span className="data-row-key">network</span><span className="data-row-value" style={{ color: "var(--accent-blue)" }}>Solana Devnet</span></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirmation step
// ---------------------------------------------------------------------------

function ConfirmationStep({
  config,
  onConfirm,
  onCancel,
}: {
  config: ConfigStatus;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
        <div className="flex items-start gap-2 mb-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--accent-amber)" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 2 }}>
            <path d="M8 2L14.5 13.5H1.5L8 2z" />
            <path d="M8 7v3M8 11.5v.5" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-semibold" style={{ color: "var(--accent-amber)" }}>
            Confirm on-chain registration
          </p>
        </div>
        <ul className="text-sm text-[var(--text-secondary)] space-y-1 ml-5 list-disc">
          <li>Uploads agent metadata to IPFS (Pinata) and submits a <strong>Solana Devnet</strong> transaction.</li>
          <li>Estimated cost: <strong>~0.00924 SOL</strong> (devnet — not real money).</li>
          <li>The NFT is minted in the Solana devnet registry program.</li>
          <li>Network: <strong>{config.cluster}</strong></li>
        </ul>
      </div>
      <div className="flex gap-3">
        <button className="btn btn-primary btn-md flex-1" onClick={onConfirm}>
          Confirm &amp; Register on Devnet
        </button>
        <button className="btn btn-secondary btn-md" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Success panel
// ---------------------------------------------------------------------------

function SuccessPanel({ result }: { result: RegisterApiResponse }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
        <span className="dot dot-green" />
        <span className="text-sm font-medium" style={{ color: "var(--accent-green)" }}>
          {result.alreadyRegistered ? "Agent already registered — returning existing record." : "Agent registered on Solana Devnet!"}
        </span>
      </div>

      <div className="mono-block space-y-0">
        <div className="data-row">
          <span className="data-row-key">asset (pubkey)</span>
          <span className="data-row-value" style={{ color: "var(--accent-green)", wordBreak: "break-all" }}>{result.agentId}</span>
        </div>
        {result.signature && (
          <div className="data-row">
            <span className="data-row-key">tx signature</span>
            <span className="data-row-value" style={{ wordBreak: "break-all", fontSize: "0.6875rem" }}>{result.signature}</span>
          </div>
        )}
        {result.metadataUri && (
          <div className="data-row">
            <span className="data-row-key">metadata URI</span>
            <span className="data-row-value" style={{ wordBreak: "break-all" }}>{result.metadataUri}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {result.explorerUrl && (
          <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            View Agent on Explorer ↗
          </a>
        )}
        {result.txExplorerUrl && !result.alreadyRegistered && (
          <a href={result.txExplorerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            View Transaction ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registration panel (left column)
// ---------------------------------------------------------------------------

function RegistrationPanel() {
  const [state, setState] = useState<RegistrationState>({ phase: "idle" });

  const loadStatus = useCallback(async () => {
    setState({ phase: "loading_config" });
    try {
      const res = await fetch("/api/agents/registered");
      const data: RegisteredApiResponse = await res.json();
      setState({ phase: "ready", config: data.config, records: data.records });
    } catch (err: unknown) {
      setState({ phase: "error", message: err instanceof Error ? err.message : "Failed to load." });
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  function handleRegisterClick() {
    if (state.phase !== "ready") return;
    setState({ phase: "confirming", config: state.config, records: state.records });
  }

  function handleCancel() {
    if (state.phase !== "confirming") return;
    setState({ phase: "ready", config: state.config, records: state.records });
  }

  async function handleConfirm() {
    setState({ phase: "registering" });
    try {
      const res = await fetch("/api/agents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "coordinator" }),
      });
      const data: RegisterApiResponse = await res.json();
      if (data.ok) {
        setState({ phase: "success", result: data });
      } else {
        setState({ phase: "error", message: data.error ?? "Registration failed.", code: data.code });
      }
    } catch (err: unknown) {
      setState({ phase: "error", message: err instanceof Error ? err.message : "Network error." });
    }
  }

  if (state.phase === "loading_config") {
    return <Card><div className="flex items-center gap-2 text-sm text-[var(--text-muted)]"><span className="dot dot-yellow" /> Checking configuration…</div></Card>;
  }

  if (state.phase === "error") {
    return (
      <Card>
        <SectionHeading>Registration</SectionHeading>
        <div className="p-3 rounded-lg text-sm mb-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--accent-red)" }}>
          <strong>{state.code === "MISSING_CONFIG" ? "Configuration required" : "Error"}:</strong> {state.message}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadStatus}>Retry</button>
      </Card>
    );
  }

  if (state.phase === "success") {
    return (
      <Card>
        <SectionHeading>Registration</SectionHeading>
        <SuccessPanel result={state.result} />
        <button className="btn btn-ghost btn-sm mt-4" onClick={loadStatus} style={{ color: "var(--text-muted)" }}>← Back to registry</button>
      </Card>
    );
  }

  const config = (state.phase === "ready" || state.phase === "confirming") ? state.config : null;
  const records = (state.phase === "ready" || state.phase === "confirming") ? state.records : [];
  const isFullyConfigured = config ? config.signerConfigured && config.ipfsConfigured : false;
  const coordinatorRegistered = records.some((r) => r.agentId === "coordinator");

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <SectionHeading>Register Agent on Devnet</SectionHeading>
        <Badge variant="amber">Devnet</Badge>
      </div>

      <div className="mb-5">
        <p className="text-xs text-[var(--text-muted)] mb-3">Agent to register</p>
        <AgentPreview />
      </div>

      <div className="my-4" style={{ borderTop: "1px solid var(--border-subtle)" }} />

      {config && (
        <div className="mb-5">
          <p className="text-xs text-[var(--text-muted)] mb-3">Server configuration</p>
          <ConfigPanel config={config} />
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded mb-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 7v4M8 5.5v.5" strokeLinecap="round" />
        </svg>
        <p className="text-xs text-[var(--text-muted)]">
          Registration costs <strong style={{ color: "var(--text-secondary)" }}>~0.00924 SOL</strong> (devnet, not real money). Figure taken from SDK&apos;s <code className="code-tag">COSTS.md</code>.
        </p>
      </div>

      {state.phase === "confirming" && config && (
        <ConfirmationStep config={config} onConfirm={handleConfirm} onCancel={handleCancel} />
      )}

      {state.phase === "registering" && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="animate-spin">
            <path d="M13.5 2.5A7 7 0 1 1 3 11" /><path d="M13.5 2.5V7h-4.5" />
          </svg>
          Uploading metadata and submitting transaction…
        </div>
      )}

      {state.phase === "ready" && (
        coordinatorRegistered ? (
          <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="dot dot-green" />
              <span className="font-medium" style={{ color: "var(--accent-green)" }}>Already registered</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Coordinator is in <code className="code-tag">data/registered-agents.json</code>. Re-registering would cost additional devnet SOL.
            </p>
          </div>
        ) : !isFullyConfigured ? (
          <div>
            <button className="btn btn-primary btn-md w-full" disabled>Register Agent on Devnet</button>
            <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
              Add missing config to <code className="code-tag">.env.local</code> to enable.
            </p>
          </div>
        ) : (
          <button className="btn btn-primary btn-md w-full" onClick={handleRegisterClick}>
            Register Agent on Devnet →
          </button>
        )
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Right column — full agent roster
// ---------------------------------------------------------------------------

function AgentRoster() {
  const [records, setRecords] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents/registered")
      .then((r) => r.json())
      .then((d: RegisteredApiResponse) => {
        setRecords(d.records ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-[var(--text-muted)]">
        <span className="dot dot-yellow" /> Loading…
      </div>
    );
  }

  const realAgent = records.find((r) => r.agentId === "coordinator");

  return (
    <div className="space-y-4">
      {/* ── On-chain agents ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <SectionHeading>On-Chain Agents</SectionHeading>
          <Badge variant="green">{realAgent ? "1" : "0"} registered</Badge>
        </div>

        {realAgent ? (
          <RegisteredAgentCard record={realAgent} />
        ) : (
          <EmptyState
            icon={
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <circle cx="8" cy="5" r="2.5" />
                <path d="M2.5 13.5c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5" strokeLinecap="round" />
              </svg>
            }
            title="No agents registered yet"
            subtitle="Use the registration panel to register the Coordinator on Solana Devnet."
          />
        )}
      </div>

      {/* ── Mock specialist agents ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <SectionHeading>Specialist Agents</SectionHeading>
          <Badge variant="violet">Mock · Demo data</Badge>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          These agents are not registered on-chain. They demonstrate the specialist
          pool that the delegation flow (Phase 3) will use. Scores and feedback
          counts are simulated.
        </p>
        <div className="grid gap-3 sm:grid-cols-1 xl:grid-cols-1">
          {MOCK_AGENTS.map((agent) => (
            <MockAgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AgentRegistryPage() {
  return (
    <div className="page-content">
      <PageHeader
        title="Agent Registry"
        description="Register and discover agents on the Solana Agent Registry. Each agent is a Metaplex Core NFT with on-chain identity and IPFS metadata."
        actions={<Badge variant="blue">Phase 2B</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left: registration panel + program reference */}
        <div className="space-y-5">
          <RegistrationPanel />

          <Card>
            <SectionHeading>Registry Programs (Devnet)</SectionHeading>
            <div className="space-y-4">
              {[
                { name: "Agent Registry (8004)", address: "6MuHv4dY4p9E4hSCEPr9dgbCSpMhq8x1vrUexbMVjfw1" },
                { name: "ATOM Reputation Engine", address: "6Mu7qj6tRDrqchxJJPjr9V1H2XQjCerVKixFEEMwC1Tf" },
              ].map((p) => (
                <div key={p.name}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
                    <Badge variant="amber">devnet</Badge>
                  </div>
                  <a
                    href={`https://explorer.solana.com/address/${p.address}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link font-mono text-xs break-all"
                    style={{ color: "var(--accent-blue)" }}
                  >
                    {p.address} ↗
                  </a>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: agent roster */}
        <AgentRoster />
      </div>
    </div>
  );
}
