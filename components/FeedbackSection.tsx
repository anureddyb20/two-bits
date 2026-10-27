"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui";

export interface TaskFeedback {
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
}

interface FeedbackSectionProps {
  taskId: string;
  agentId?: string;
  mode: "demo" | "live";
  existingFeedback?: TaskFeedback | null;
  onFeedbackSaved: (feedback: TaskFeedback) => void;
}

const TAG_OPTIONS = [
  "Accurate",
  "Comprehensive",
  "Fast response",
  "Well structured",
  "Clear reasoning",
  "Incomplete result",
  "Slow response",
  "Formatting issues",
  "Needs clarification",
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export function FeedbackSection({
  taskId,
  agentId,
  mode,
  existingFeedback,
  onFeedbackSaved,
}: FeedbackSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Form states
  const [overallRating, setOverallRating] = useState<number>(existingFeedback?.overallRating ?? 5);
  const [outcome, setOutcome] = useState<"successful" | "partial" | "unsuccessful">(
    existingFeedback?.outcome ?? "successful"
  );
  const [accuracy, setAccuracy] = useState<number>(existingFeedback?.accuracy ?? 5);
  const [quality, setQuality] = useState<number>(existingFeedback?.quality ?? 5);
  const [speed, setSpeed] = useState<number>(existingFeedback?.speed ?? 5);
  const [review, setReview] = useState<string>(existingFeedback?.review ?? "");
  const [tags, setTags] = useState<string[]>(existingFeedback?.tags ?? ["Accurate", "Comprehensive"]);
  const [postOnChain, setPostOnChain] = useState<boolean>(true);

  // Submission states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          agentId,
          executionMode: mode,
          overallRating,
          outcome,
          accuracy,
          quality,
          speed,
          review,
          tags,
          postOnChain: mode === "live" && postOnChain,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save feedback");
      }

      setSuccessMsg(data.onChainNote ? `Feedback saved! (${data.onChainNote})` : "Feedback saved successfully!");
      onFeedbackSaved(data.feedback);
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMsg(null);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Display existing feedback if not in edit mode
  if (existingFeedback && !isOpen) {
    const outcomeVariant =
      existingFeedback.outcome === "successful"
        ? "green"
        : existingFeedback.outcome === "partial"
        ? "amber"
        : "red";

    return (
      <div className="mt-3 p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold text-sm tracking-wide">
              {"★".repeat(existingFeedback.overallRating)}
              {"☆".repeat(5 - existingFeedback.overallRating)}
            </span>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {existingFeedback.overallRating}.0 / 5.0
            </span>
            <Badge variant={outcomeVariant} className="capitalize">
              {existingFeedback.outcome}
            </Badge>
          </div>
          <button
            type="button"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline cursor-pointer transition-colors"
            onClick={() => setIsOpen(true)}
          >
            Edit Feedback
          </button>
        </div>

        {/* Detailed Metrics */}
        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
          <span className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            Accuracy: <strong className="text-[var(--text-primary)]">{existingFeedback.accuracy}/5</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            Quality: <strong className="text-[var(--text-primary)]">{existingFeedback.quality}/5</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            Speed: <strong className="text-[var(--text-primary)]">{existingFeedback.speed}/5</strong>
          </span>
        </div>

        {/* Review Note */}
        {existingFeedback.review && (
          <p className="text-xs text-[var(--text-secondary)] italic border-l-2 border-[var(--accent-blue)] pl-2.5 py-0.5 my-1">
            &ldquo;{existingFeedback.review}&rdquo;
          </p>
        )}

        {/* Tags */}
        {existingFeedback.tags && existingFeedback.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {existingFeedback.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* On-Chain Verification Link */}
        {existingFeedback.txSignature && (
          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
              </svg>
              Verified on Solana Devnet (ATOM Engine)
            </span>
            <a
              href={existingFeedback.explorerUrl || `https://explorer.solana.com/tx/${existingFeedback.txSignature}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent-blue)] hover:underline flex items-center gap-1"
            >
              View Explorer ↗
            </a>
          </div>
        )}
      </div>
    );
  }

  // 2. Unopened trigger button
  if (!isOpen) {
    return (
      <div className="mt-3 pt-2 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          className="btn btn-secondary btn-sm flex items-center gap-1.5 hover:border-[var(--accent-blue)] transition-all cursor-pointer"
          onClick={() => setIsOpen(true)}
        >
          <span className="text-amber-400">★</span>
          <span>Rate Agent & Leave Feedback</span>
        </button>
      </div>
    );
  }

  // 3. Interactive Feedback Form
  const activeRating = hoverRating ?? overallRating;

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] space-y-4 shadow-lg animate-in fade-in duration-150"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">Agent Feedback</h4>
          <p className="text-xs text-[var(--text-muted)]">
            Evaluate performance for agent <code className="code-tag">{agentId || "coordinator"}</code>
          </p>
        </div>
        <button
          type="button"
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          onClick={() => setIsOpen(false)}
        >
          ✕ Cancel
        </button>
      </div>

      {/* Overall Star Rating */}
      <div>
        <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
          Overall Rating
        </label>
        <div className="flex items-center gap-2">
          <div className="flex items-center text-xl cursor-pointer select-none">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`p-1 transition-transform hover:scale-110 ${
                  star <= activeRating ? "text-amber-400" : "text-[var(--text-muted)]"
                }`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                onClick={() => setOverallRating(star)}
              >
                ★
              </button>
            ))}
          </div>
          <span className="text-xs font-semibold text-[var(--text-primary)] px-2 py-0.5 rounded bg-[var(--bg-surface)]">
            {overallRating} / 5 — {RATING_DESCRIPTIONS[overallRating]}
          </span>
        </div>
      </div>

      {/* Task Outcome */}
      <div>
        <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
          Task Outcome
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "successful", label: "Successful", icon: "✓", color: "hover:border-emerald-500", active: "bg-emerald-950/40 border-emerald-500 text-emerald-300" },
              { id: "partial", label: "Partial", icon: "◐", color: "hover:border-amber-500", active: "bg-amber-950/40 border-amber-500 text-amber-300" },
              { id: "unsuccessful", label: "Failed", icon: "✕", color: "hover:border-rose-500", active: "bg-rose-950/40 border-rose-500 text-rose-300" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`py-1.5 px-2 text-xs font-medium rounded-md border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                outcome === opt.id
                  ? opt.active
                  : `border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] ${opt.color}`
              }`}
              onClick={() => setOutcome(opt.id)}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dimension Sub-Ratings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-md bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        <div>
          <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
            Accuracy ({accuracy}/5)
          </label>
          <div className="flex gap-1 text-sm text-amber-400">
            {[1, 2, 3, 4, 5].map((v) => (
              <span
                key={v}
                className="cursor-pointer"
                onClick={() => setAccuracy(v)}
              >
                {v <= accuracy ? "★" : "☆"}
              </span>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
            Quality ({quality}/5)
          </label>
          <div className="flex gap-1 text-sm text-amber-400">
            {[1, 2, 3, 4, 5].map((v) => (
              <span
                key={v}
                className="cursor-pointer"
                onClick={() => setQuality(v)}
              >
                {v <= quality ? "★" : "☆"}
              </span>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[11px] font-medium text-[var(--text-muted)] block mb-1">
            Speed ({speed}/5)
          </label>
          <div className="flex gap-1 text-sm text-amber-400">
            {[1, 2, 3, 4, 5].map((v) => (
              <span
                key={v}
                className="cursor-pointer"
                onClick={() => setSpeed(v)}
              >
                {v <= speed ? "★" : "☆"}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Review Comment */}
      <div>
        <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
          Review / Notes (Optional)
        </label>
        <textarea
          rows={2}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Describe the agent's work, reasoning quality, or areas for improvement..."
          className="task-textarea text-xs"
        />
      </div>

      {/* Quick Tags */}
      <div>
        <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
          Feedback Tags
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TAG_OPTIONS.map((tag) => {
            const isSelected = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[rgba(59,130,246,0.15)] border-[var(--accent-blue)] text-[var(--accent-blue)] font-medium"
                    : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-default)]"
                }`}
                onClick={() => toggleTag(tag)}
              >
                {isSelected ? `✓ ${tag}` : `+ ${tag}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* On-Chain Solana Verification Option */}
      {mode === "live" && (
        <div className="p-2.5 rounded-md bg-[rgba(59,130,246,0.06)] border border-[rgba(59,130,246,0.2)] flex items-start gap-2.5">
          <input
            type="checkbox"
            id={`post-onchain-${taskId}`}
            checked={postOnChain}
            onChange={(e) => setPostOnChain(e.target.checked)}
            className="mt-0.5 rounded cursor-pointer accent-[var(--accent-blue)]"
          />
          <label htmlFor={`post-onchain-${taskId}`} className="text-xs cursor-pointer select-none">
            <strong className="text-[var(--text-primary)] block">
              Write to Solana Devnet (ATOM Reputation Engine)
            </strong>
            <span className="text-[var(--text-muted)] block mt-0.5">
              Signs an on-chain feedback transaction closing the trust loop in the 8004 Agent Registry.
            </span>
          </label>
        </div>
      )}

      {/* Feedback Messages */}
      {error && (
        <div className="p-2.5 rounded bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-2.5 rounded bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs">
          {successMsg}
        </div>
      )}

      {/* Submit / Cancel Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary btn-sm flex items-center gap-1.5 cursor-pointer"
        >
          {submitting ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Submitting…</span>
            </>
          ) : (
            <span>Submit Feedback</span>
          )}
        </button>
        <button
          type="button"
          disabled={submitting}
          className="btn btn-secondary btn-sm cursor-pointer"
          onClick={() => setIsOpen(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
