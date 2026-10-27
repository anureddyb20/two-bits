"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Badge,
  Card,
  SectionHeading,
  EmptyState,
  PageHeader,
} from "@/components/ui";

interface TaskFeedback {
  id: string;
  taskId: string;
  agentId?: string;
  executionMode: "demo" | "live";
  overallRating: number;
  outcome: "successful" | "partial" | "unsuccessful";
  accuracy: number;
  quality: number;
  speed: number;
  review?: string;
  tags: string[];
  onChain?: boolean;
  txSignature?: string;
  explorerUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<TaskFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [search, setSearch] = useState("");
  const [filterOutcome, setFilterOutcome] = useState<string>("all");
  const [filterOnChain, setFilterOnChain] = useState<string>("all");
  const [minRating, setMinRating] = useState<number>(0);

  const fetchFeedbacks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback/list");
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.feedbacks)) {
        // Sort descending by created date
        const sorted = [...data.feedbacks].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setFeedbacks(sorted);
      } else {
        throw new Error(data.error || "Failed to parse feedback records");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  // Filtered feedbacks
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      if (filterOutcome !== "all" && fb.outcome !== filterOutcome) return false;
      if (filterOnChain === "verified" && (!fb.onChain || !fb.txSignature)) return false;
      if (filterOnChain === "offchain" && fb.onChain && fb.txSignature) return false;
      if (minRating > 0 && fb.overallRating < minRating) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchReview = fb.review?.toLowerCase().includes(q);
        const matchAgent = fb.agentId?.toLowerCase().includes(q);
        const matchTask = fb.taskId.toLowerCase().includes(q);
        const matchTags = fb.tags?.some((t) => t.toLowerCase().includes(q));
        const matchTx = fb.txSignature?.toLowerCase().includes(q);
        if (!matchReview && !matchAgent && !matchTask && !matchTags && !matchTx) {
          return false;
        }
      }

      return true;
    });
  }, [feedbacks, filterOutcome, filterOnChain, minRating, search]);

  // Metrics
  const metrics = useMemo(() => {
    if (feedbacks.length === 0) {
      return {
        total: 0,
        avgRating: 0,
        verifiedCount: 0,
        verifiedRate: 0,
        avgAccuracy: 0,
        avgQuality: 0,
        avgSpeed: 0,
      };
    }
    const total = feedbacks.length;
    const avgRating = feedbacks.reduce((acc, f) => acc + (f.overallRating || 0), 0) / total;
    const verifiedCount = feedbacks.filter((f) => f.onChain && f.txSignature).length;
    const verifiedRate = Math.round((verifiedCount / total) * 100);
    const avgAccuracy = feedbacks.reduce((acc, f) => acc + (f.accuracy || 0), 0) / total;
    const avgQuality = feedbacks.reduce((acc, f) => acc + (f.quality || 0), 0) / total;
    const avgSpeed = feedbacks.reduce((acc, f) => acc + (f.speed || 0), 0) / total;

    return {
      total,
      avgRating: avgRating.toFixed(1),
      verifiedCount,
      verifiedRate,
      avgAccuracy: avgAccuracy.toFixed(1),
      avgQuality: avgQuality.toFixed(1),
      avgSpeed: avgSpeed.toFixed(1),
    };
  }, [feedbacks]);

  return (
    <div className="page-content">
      <PageHeader
        title="Agent Feedback Hub"
        description="Public reputation ledger of task evaluations, performance reviews, and on-chain ATOM feedback transactions."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/task-center" className="btn btn-secondary btn-sm">
              + Rate a Task in Task Center
            </Link>
            <button
              onClick={fetchFeedbacks}
              disabled={loading}
              className="btn btn-ghost btn-sm"
              title="Refresh feedback list"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className={loading ? "animate-spin" : ""}
              >
                <path d="M13.5 2.5A7 7 0 1 1 3 11" />
                <path d="M13.5 2.5V7h-4.5" />
              </svg>
              Refresh
            </button>
          </div>
        }
      />

      {/* Top Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="metric-card">
          <p className="metric-label">Total Reviews</p>
          <p className="metric-value text-[var(--accent-indigo)]">{metrics.total}</p>
          <p className="text-xs text-[var(--text-muted)]">Evaluations submitted</p>
        </div>

        <div className="metric-card">
          <p className="metric-label">Average Score</p>
          <p className="metric-value text-amber-400">
            {metrics.avgRating} <span className="text-xs text-[var(--text-muted)]">/ 5.0</span>
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Acc: {metrics.avgAccuracy} · Qual: {metrics.avgQuality} · Spd: {metrics.avgSpeed}
          </p>
        </div>

        <div className="metric-card">
          <p className="metric-label">On-Chain Verified</p>
          <p className="metric-value text-[var(--accent-cyan)]">{metrics.verifiedRate}%</p>
          <p className="text-xs text-[var(--text-muted)]">
            {metrics.verifiedCount} posted to ATOM Engine
          </p>
        </div>

        <div className="metric-card">
          <p className="metric-label">Network Protocol</p>
          <p className="metric-value text-emerald-400">ATOM v1</p>
          <p className="text-xs text-[var(--text-muted)]">Solana Devnet Program</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <Card padding="p-4" className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by review text, tag, agent, or task ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="task-input text-xs w-full pl-8"
            />
            <svg
              className="absolute left-2.5 top-2.5 text-[var(--text-muted)] w-3.5 h-3.5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" strokeLinecap="round" />
            </svg>
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value)}
              className="task-select text-xs py-1.5 px-2.5"
            >
              <option value="all">All Outcomes</option>
              <option value="successful">Successful</option>
              <option value="partial">Partial</option>
              <option value="unsuccessful">Failed</option>
            </select>

            <select
              value={filterOnChain}
              onChange={(e) => setFilterOnChain(e.target.value)}
              className="task-select text-xs py-1.5 px-2.5"
            >
              <option value="all">All Records</option>
              <option value="verified">Verified On-Chain Only</option>
              <option value="offchain">Off-Chain Only</option>
            </select>

            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="task-select text-xs py-1.5 px-2.5"
            >
              <option value={0}>All Ratings</option>
              <option value={5}>5 Stars only</option>
              <option value={4}>4+ Stars</option>
              <option value={3}>3+ Stars</option>
            </select>

            {(search || filterOutcome !== "all" || filterOnChain !== "all" || minRating > 0) && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilterOutcome("all");
                  setFilterOnChain("all");
                  setMinRating(0);
                }}
                className="btn btn-ghost btn-sm text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Feedback List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeading>
            Public Evaluations ({filteredFeedbacks.length}
            {filteredFeedbacks.length !== feedbacks.length ? ` of ${feedbacks.length}` : ""})
          </SectionHeading>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            Source: local store & Solana ATOM engine
          </span>
        </div>

        {loading ? (
          <Card>
            <div className="flex items-center justify-center py-12 gap-3 text-sm text-[var(--text-secondary)]">
              <svg className="animate-spin h-5 w-5 text-[var(--accent-indigo)]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Loading public feedback ledger…</span>
            </div>
          </Card>
        ) : error ? (
          <Card>
            <div className="p-4 rounded bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs">
              <strong>Error loading feedback:</strong> {error}
            </div>
          </Card>
        ) : filteredFeedbacks.length === 0 ? (
          <Card>
            <EmptyState
              icon={
                <svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M2.5 3.5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6.5l-3.5 2.5v-2.5h-1a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z" strokeLinejoin="round" />
                  <path d="M6 7.5l1.5 1.5 3-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title={feedbacks.length === 0 ? "No feedback submitted yet" : "No matching reviews"}
              subtitle={
                feedbacks.length === 0
                  ? "Run a task in the Task Center and submit an evaluation to populate this public ledger."
                  : "Try loosening your search filters to view other feedback records."
              }
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredFeedbacks.map((fb) => {
              const outcomeVariant =
                fb.outcome === "successful" ? "green" : fb.outcome === "partial" ? "amber" : "red";

              const formattedDate = new Date(fb.createdAt).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={fb.id}
                  className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all space-y-3.5 shadow-sm"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[var(--border-subtle)] pb-3">
                    <div className="flex items-center flex-wrap gap-2.5">
                      {/* Star Display */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400 font-bold text-base tracking-wide">
                          {"★".repeat(fb.overallRating)}
                          {"☆".repeat(Math.max(0, 5 - fb.overallRating))}
                        </span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {fb.overallRating}.0 / 5.0
                        </span>
                      </div>

                      {/* Agent Badge */}
                      <Badge variant="cyan" className="font-mono text-xs">
                        agent: {fb.agentId || "coordinator"}
                      </Badge>

                      {/* Outcome Badge */}
                      <Badge variant={outcomeVariant} className="capitalize text-xs font-semibold">
                        {fb.outcome}
                      </Badge>

                      {/* Execution Mode */}
                      <Badge variant={fb.executionMode === "live" ? "blue" : "muted"} className="capitalize text-xs">
                        {fb.executionMode} mode
                      </Badge>
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="8" cy="8" r="6" />
                        <path d="M8 5v3.5l2.5 1.5" strokeLinecap="round" />
                      </svg>
                      {formattedDate}
                    </div>
                  </div>

                  {/* Review Quote (if written) */}
                  {fb.review ? (
                    <div className="p-3.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] border-l-4 border-l-[var(--accent-indigo)]">
                      <p className="text-xs text-[var(--text-primary)] leading-relaxed italic">
                        &ldquo;{fb.review}&rdquo;
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] italic">
                      No written review provided.
                    </p>
                  )}

                  {/* Dimension Ratings */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-3 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)]">
                      Accuracy: <strong className="text-[var(--text-primary)]">{fb.accuracy}/5</strong>
                    </span>
                    <span className="px-3 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)]">
                      Quality: <strong className="text-[var(--text-primary)]">{fb.quality}/5</strong>
                    </span>
                    <span className="px-3 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)]">
                      Speed: <strong className="text-[var(--text-primary)]">{fb.speed}/5</strong>
                    </span>
                  </div>

                  {/* Tags */}
                  {fb.tags && fb.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {fb.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2.5 py-0.5 rounded-full bg-[rgba(124,140,255,0.08)] border border-[rgba(124,140,255,0.25)] text-[var(--accent-indigo)] font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Card Footer: Task ID and On-Chain Proof */}
                  <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] font-mono text-[11px] truncate">
                      <span>Task:</span>
                      <span className="text-[var(--text-secondary)] truncate max-w-[280px]">
                        {fb.taskId}
                      </span>
                    </div>

                    {fb.txSignature ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-xs">
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                          </svg>
                          Solana Verified
                        </span>
                        <a
                          href={
                            fb.explorerUrl ||
                            `https://explorer.solana.com/tx/${fb.txSignature}?cluster=devnet`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-[var(--accent-cyan)] hover:underline flex items-center gap-1"
                          title="View on Solana Explorer"
                        >
                          {fb.txSignature.slice(0, 8)}…{fb.txSignature.slice(-6)} ↗
                        </a>
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)] text-xs">
                        Off-chain evaluation
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
