"use client";

/**
 * app/technical/page.tsx
 * Technical Details — migrated from the Phase 1 landing page.
 * All addresses, SDK details, and architecture data are preserved exactly.
 */

import { useEffect, useState, useCallback } from "react";
import {
  Badge,
  Card,
  SectionHeading,
  Divider,
  PageHeader,
} from "@/components/ui";

interface HealthResponse {
  ok: boolean;
  cluster: string;
  rpcUrl: string;
  currentSlot: number | null;
  rpcHealth: string | null;
  checkedAt: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Health check panel (full detail)
// ---------------------------------------------------------------------------
function HealthPanel() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/health");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d: HealthResponse = await r.json();
      setData(d);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { run(); }, [run]);

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <SectionHeading>Devnet Health Check — GET /api/health</SectionHeading>
        <button
          className="btn btn-ghost btn-sm"
          onClick={run}
          disabled={loading}
        >
          <svg
            width="12" height="12" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            className={loading ? "animate-spin" : ""}
          >
            <path d="M13.5 2.5A7 7 0 1 1 3 11" />
            <path d="M13.5 2.5V7h-4.5" />
          </svg>
          {loading ? "Checking…" : "Re-check"}
        </button>
      </div>

      {err && (
        <p className="text-xs text-[var(--accent-red)] font-mono mb-3 p-3 rounded"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {err}
        </p>
      )}

      {data && (
        <div className="mono-block space-y-0">
          {[
            { k: "ok",          v: String(data.ok),          color: data.ok ? "var(--accent-green)" : "var(--accent-red)" },
            { k: "cluster",     v: data.cluster },
            { k: "rpcUrl",      v: data.rpcUrl },
            { k: "currentSlot", v: data.currentSlot?.toLocaleString() ?? "—", color: "var(--accent-green)" },
            { k: "rpcHealth",   v: data.rpcHealth ?? "—",    color: data.rpcHealth === "ok" ? "var(--accent-green)" : "var(--accent-amber)" },
            { k: "checkedAt",   v: data.checkedAt },
            ...(data.error ? [{ k: "error", v: data.error, color: "var(--accent-red)" }] : []),
          ].map(({ k, v, color }) => (
            <div key={k} className="data-row">
              <span className="data-row-key">{k}</span>
              <span className="data-row-value" style={color ? { color } : undefined}>{v}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-[var(--text-muted)] mt-3">
        Calls <code className="code-tag">@solana/web3.js Connection.getSlot()</code>{" "}
        server-side. No private key. No transaction.
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Program IDs
// ---------------------------------------------------------------------------
const PROGRAMS = [
  { name: "Agent Registry (8004)",  address: "6MuHv4dY4p9E4hSCEPr9dgbCSpMhq8x1vrUexbMVjfw1", net: "devnet" },
  { name: "ATOM Reputation Engine", address: "6Mu7qj6tRDrqchxJJPjr9V1H2XQjCerVKixFEEMwC1Tf", net: "devnet" },
  { name: "Agent Registry (8004) — Mainnet", address: "8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ", net: "mainnet" },
  { name: "ATOM Engine — Mainnet",  address: "AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb", net: "mainnet" },
];

function ProgramIds() {
  return (
    <Card>
      <SectionHeading>On-Chain Program IDs</SectionHeading>
      <div className="space-y-4">
        {PROGRAMS.map((p) => (
          <div key={p.address}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
              <Badge variant={p.net === "devnet" ? "amber" : "green"}>{p.net}</Badge>
            </div>
            <a
              href={`https://explorer.solana.com/address/${p.address}?cluster=${p.net === "devnet" ? "devnet" : "mainnet-beta"}`}
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
      <p className="text-[11px] text-[var(--text-muted)] mt-3">
        Source:{" "}
        <a href="https://8004.qnt.sh" target="_blank" rel="noopener noreferrer" className="link">
          8004.qnt.sh
        </a>
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SDK info
// ---------------------------------------------------------------------------
function SdkInfo() {
  const rows = [
    { k: "Package",          v: "8004-solana" },
    { k: "Version",          v: "0.8.5" },
    { k: "Node requirement", v: ">=20.19.0" },
    { k: "Phase 1 mode",     v: "Read-only — no signer" },
    { k: "Peer dep",         v: "@solana/web3.js 1.99.0" },
    { k: "Indexer (devnet)", v: "8004-indexer-dev.qnt.sh" },
    { k: "Standard",         v: "ERC-8004 Trustless Agents" },
  ];

  return (
    <Card>
      <SectionHeading>SDK & Dependencies</SectionHeading>
      <div className="mono-block space-y-0">
        {rows.map(({ k, v }) => (
          <div key={k} className="data-row">
            <span className="data-row-key">{k}</span>
            <span className="data-row-value">{v}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        <a href="https://github.com/QuantuLabs/8004-solana-ts" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
          SDK Repo ↗
        </a>
        <a href="https://8004.qnt.sh" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
          SDK Docs ↗
        </a>
        <a href="https://eips.ethereum.org/EIPS/eip-8004" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
          ERC-8004 Spec ↗
        </a>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Architecture table
// ---------------------------------------------------------------------------
const ARCH_ROWS = [
  { action: "Agent registration (NFT mint)",  location: "Solana devnet",                    onChain: true,  phase: 2 },
  { action: "Read agent identity & metadata", location: "8004-solana SDK → devnet",          onChain: true,  phase: 2 },
  { action: "Reputation score lookup (ATOM)", location: "8004-solana SDK → devnet",          onChain: true,  phase: 2 },
  { action: "Agent discovery via indexer",    location: "8004-indexer-dev.qnt.sh (GraphQL)", onChain: true,  phase: 2 },
  { action: "Post feedback after task",       location: "ATOM program → devnet",             onChain: true,  phase: 4 },
  { action: "ProofPass verified feedback",    location: "8004 registry program → devnet",    onChain: true,  phase: 4 },
  { action: "Agent selection algorithm",      location: "Orchestrator (TypeScript, server)", onChain: false, phase: 3 },
  { action: "Task delegation (send prompt)",  location: "HTTP fetch to agent endpoint (A2A)",onChain: false, phase: 3 },
  { action: "Result validation heuristics",   location: "Orchestrator (TypeScript, server)", onChain: false, phase: 4 },
  { action: "Mock agent execution",           location: "In-process demo functions",         onChain: false, phase: 3 },
];

function ArchTable() {
  return (
    <Card>
      <SectionHeading>Architecture — On-Chain vs Application Logic</SectionHeading>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Runs In</th>
              <th>On-Chain?</th>
              <th>Phase</th>
            </tr>
          </thead>
          <tbody>
            {ARCH_ROWS.map((r) => (
              <tr key={r.action}>
                <td>{r.action}</td>
                <td style={{ fontFamily: "var(--font-geist-mono)" }}>{r.location}</td>
                <td>
                  {r.onChain
                    ? <Badge variant="green">✓ On-chain</Badge>
                    : <Badge variant="violet">App-level</Badge>}
                </td>
                <td><Badge variant="muted">P{r.phase}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function TechnicalPage() {
  return (
    <div className="page-content">
      <PageHeader
        title="Technical Details"
        description="Verified program IDs, SDK configuration, architecture decisions, and live devnet health data."
      />

      <div className="space-y-5">
        <HealthPanel />

        <div className="grid gap-5 lg:grid-cols-2">
          <ProgramIds />
          <SdkInfo />
        </div>

        <Divider />

        <ArchTable />

        {/* Links */}
        <Card>
          <SectionHeading>Documentation Links</SectionHeading>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Solana Agent Registry", href: "https://solana.com/agent-registry" },
              { label: "ERC-8004 Specification", href: "https://eips.ethereum.org/EIPS/eip-8004" },
              { label: "8004-solana SDK", href: "https://github.com/QuantuLabs/8004-solana-ts" },
              { label: "8004 SDK Docs", href: "https://8004.qnt.sh" },
              { label: "Solana Explorer (devnet)", href: "https://explorer.solana.com/?cluster=devnet" },
              { label: "SATI Dashboard", href: "https://github.com/cascade-protocol/sati" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                {l.label} ↗
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
