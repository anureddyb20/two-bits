"use client";

/**
 * app/page.tsx — Overview
 *
 * Phase 1.5 redesign.
 * Real data: devnet connectivity slot via /api/health.
 * All other metrics are honest empty states — no invented numbers.
 */

import { useEffect, useState, useCallback } from "react";
import {
  Badge,
  Card,
  SectionHeading,
  Divider,
  EmptyState,
  ComingSoonBanner,
  PageHeader,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface HealthResponse {
  ok: boolean;
  cluster: string;
  rpcUrl: string;
  currentSlot: number | null;
  rpcHealth: string | null;
  checkedAt: string;
  error?: string;
}
type CheckState = "idle" | "loading" | "success" | "error";

// ---------------------------------------------------------------------------
// A. Connectivity status bar (compact — sits in page header)
// ---------------------------------------------------------------------------
function ConnectivityStatus({
  state,
  data,
  onRefresh,
}: {
  state: CheckState;
  data: HealthResponse | null;
  onRefresh: () => void;
}) {
  const dotClass =
    state === "success"
      ? "dot-green"
      : state === "error"
      ? "dot-red"
      : "dot-yellow";

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <span className={`dot ${dotClass}`} />
        <span>
          {state === "loading"
            ? "Checking devnet…"
            : state === "success"
            ? "Solana devnet connected"
            : state === "error"
            ? "Devnet unreachable"
            : "Connecting…"}
        </span>
        {data?.currentSlot && state === "success" && (
          <span className="text-[var(--text-muted)] text-xs font-mono">
            slot {data.currentSlot.toLocaleString()}
          </span>
        )}
      </div>
      {data?.checkedAt && (
        <span className="text-[var(--text-muted)] text-xs hidden sm:inline">
          Last checked {new Date(data.checkedAt).toLocaleTimeString()}
        </span>
      )}
      <button
        className="btn btn-ghost btn-sm"
        onClick={onRefresh}
        disabled={state === "loading"}
        aria-label="Refresh connectivity check"
        title="Re-run health check"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className={state === "loading" ? "animate-spin" : ""}
        >
          <path d="M13.5 2.5A7 7 0 1 1 3 11" />
          <path d="M13.5 2.5V7h-4.5" />
        </svg>
        Refresh
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// B. Metric cards
// ---------------------------------------------------------------------------
type MetricStatus = "live" | "unavailable";

function MetricCard({
  label,
  value,
  status,
  sub,
  accent,
}: {
  label: string;
  value: string;
  status: MetricStatus;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p
        className={`metric-value ${status === "unavailable" ? "na" : ""}`}
        style={
          status === "live" && accent ? { color: accent } : undefined
        }
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-[var(--text-muted)]">{sub}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// C. Task input workspace (preview)
// ---------------------------------------------------------------------------
const EXAMPLE_TASKS = [
  "Summarize this research paper and extract key findings",
  "Review my Rust code for memory safety issues",
  "Analyze this dataset and identify anomalies",
  "Translate this technical specification to plain English",
];

function TaskWorkspace() {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  return (
    <Card>
      <SectionHeading>Task Workspace</SectionHeading>
      <ComingSoonBanner
        phase={3}
        label="Agent discovery and delegation will be wired in Phase 3."
      />

      <textarea
        className="task-textarea"
        rows={4}
        placeholder="Describe the task you want to delegate to a specialized agent…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Task description"
      />

      {/* Example suggestions */}
      {!focused && value === "" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLE_TASKS.map((t) => (
            <button
              key={t}
              className="btn btn-ghost btn-sm text-left"
              style={{
                fontSize: "0.75rem",
                padding: "4px 10px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                color: "var(--text-muted)",
              }}
              onClick={() => setValue(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-[var(--text-muted)]">
          {value.length > 0
            ? `${value.length} characters`
            : "Delegation requires Phase 3 — agent registration & orchestrator."}
        </p>
        <button
          className="btn btn-primary btn-md"
          disabled
          title="Available in Phase 3"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M8 2v12M2 8l6 6 6-6" />
          </svg>
          Find the Right Agent
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// D. Delegation workflow visualization
// ---------------------------------------------------------------------------
const WORKFLOW_STEPS = [
  { id: "discover",  label: "Discover",  num: "1" },
  { id: "verify",   label: "Verify",    num: "2" },
  { id: "select",   label: "Select",    num: "3" },
  { id: "delegate", label: "Delegate",  num: "4" },
  { id: "validate", label: "Validate",  num: "5" },
];

function WorkflowViz() {
  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <SectionHeading>Delegation Workflow</SectionHeading>
        <Badge variant="muted">Illustrative — Phase 3+</Badge>
      </div>
      <div className="workflow-steps">
        {WORKFLOW_STEPS.map((step) => (
          <div key={step.id} className="workflow-step step-pending">
            <div className="workflow-step-icon">{step.num}</div>
            <span className="workflow-step-label">{step.label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-4">
        This visualization will show live step states once orchestration is
        implemented in Phase 3. Steps will progress from pending → active →
        complete (or failed) as a task moves through the pipeline.
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// E. Recent activity
// ---------------------------------------------------------------------------
function RecentActivity() {
  return (
    <Card>
      <SectionHeading>Recent Activity</SectionHeading>
      <EmptyState
        icon={
          <svg
            width="18"
            height="18"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path d="M2 8h2l2-5 3 9 2-4h3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
        title="No activity yet"
        subtitle="Events will appear here once agent registration and task delegation are implemented in Phase 2 and 3."
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Connectivity detail panel (expanded)
// ---------------------------------------------------------------------------
function ConnectivityDetail({
  state,
  data,
  fetchError,
}: {
  state: CheckState;
  data: HealthResponse | null;
  fetchError: string | null;
}) {
  if (state === "loading") {
    return (
      <Card padding="p-4">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <span className="dot dot-yellow" />
          Running{" "}
          <code className="code-tag">Connection.getSlot()</code> on devnet…
        </div>
      </Card>
    );
  }

  if (fetchError) {
    return (
      <Card padding="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="dot dot-red" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Health check failed
          </span>
        </div>
        <p className="text-xs text-[var(--accent-red)] font-mono">{fetchError}</p>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card padding="p-4">
      <div className="mono-block">
        <div className="data-row" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <span className="data-row-key">cluster</span>
          <span className="data-row-value">{data.cluster}</span>
        </div>
        <div className="data-row" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <span className="data-row-key">rpcUrl</span>
          <span className="data-row-value" style={{ wordBreak: "break-all" }}>{data.rpcUrl}</span>
        </div>
        {data.currentSlot !== null && (
          <div className="data-row" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <span className="data-row-key">currentSlot</span>
            <span className="data-row-value" style={{ color: "var(--accent-green)" }}>
              {data.currentSlot.toLocaleString()}
            </span>
          </div>
        )}
        <div className="data-row" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <span className="data-row-key">rpcHealth</span>
          <span
            className="data-row-value"
            style={{
              color:
                data.rpcHealth === "ok"
                  ? "var(--accent-green)"
                  : "var(--accent-amber)",
            }}
          >
            {data.rpcHealth ?? "—"}
          </span>
        </div>
        <div className="data-row">
          <span className="data-row-key">checkedAt</span>
          <span className="data-row-value">{data.checkedAt}</span>
        </div>
        {data.error && (
          <div className="data-row">
            <span className="data-row-key">error</span>
            <span className="data-row-value" style={{ color: "var(--accent-red)" }}>
              {data.error}
            </span>
          </div>
        )}
      </div>
      <p className="text-[11px] text-[var(--text-muted)] mt-3">
        Server-side only —{" "}
        <code className="code-tag">@solana/web3.js Connection.getSlot()</code>.
        No private key. No transaction submitted.
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Overview page
// ---------------------------------------------------------------------------
export default function OverviewPage() {
  const [state, setState] = useState<CheckState>("loading");
  const [data, setData] = useState<HealthResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setState("loading");
    setFetchError(null);
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json: HealthResponse = await res.json();
      setData(json);
      setState(json.ok ? "success" : "error");
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }, []);

  useEffect(() => { runCheck(); }, [runCheck]);

  return (
    <div className="page-content">
      {/* A. Page header */}
      <PageHeader
        title="Agent Network Overview"
        description="Autonomous agent hiring and delegation powered by the Solana Agent Registry (ERC-8004)."
        actions={
          <ConnectivityStatus
            state={state}
            data={data}
            onRefresh={runCheck}
          />
        }
      />

      {/* B. Summary metrics — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Registered Agents"
          value="Not yet available"
          status="unavailable"
          sub="Available in Phase 2 after on-chain registration"
        />
        <MetricCard
          label="Tasks Completed"
          value="Not yet available"
          status="unavailable"
          sub="Available in Phase 3 after delegation"
        />
        <MetricCard
          label="Successful Validations"
          value="Not yet available"
          status="unavailable"
          sub="Available in Phase 4 after feedback loop"
        />
        <MetricCard
          label="Registry Connectivity"
          value={
            state === "success"
              ? "Connected"
              : state === "error"
              ? "Failed"
              : "Checking…"
          }
          status={state === "success" ? "live" : "unavailable"}
          accent="var(--accent-green)"
          sub={
            data?.currentSlot
              ? `Devnet slot ${data.currentSlot.toLocaleString()}`
              : state === "loading"
              ? "Running RPC probe…"
              : undefined
          }
        />
      </div>

      {/* Connectivity detail */}
      <div className="mb-6">
        <SectionHeading>Devnet Health Check — /api/health</SectionHeading>
        <ConnectivityDetail
          state={state}
          data={data}
          fetchError={fetchError}
        />
      </div>

      <Divider className="mb-6" />

      {/* C. Task workspace */}
      <div className="mb-6">
        <TaskWorkspace />
      </div>

      {/* D. Workflow viz */}
      <div className="mb-6">
        <WorkflowViz />
      </div>

      {/* E. Recent activity */}
      <RecentActivity />
    </div>
  );
}
