"use client";

import { Card, SectionHeading, EmptyState, DataRow } from "@/components/ui";
import { CATEGORY_TO_SKILLS } from "@/lib/skillMap";
import { useEffect, useState } from "react";

type AgentRecord = {
  agentId: string;
  asset: string;
  // other fields may be present
};

type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  agentId?: string;
  mode: "demo" | "live";
  status: "submitted" | "executing" | "completed" | "failed";
  result?: string;
  createdAt: string;
};

type ReputationSummary = {
  averageScore: number;
  totalFeedbacks: number;
  nextFeedbackIndex?: number;
  totalClients?: number;
  positiveCount?: number;
  negativeCount?: number;
};

export default function TaskCenterClient() {
  // Types for on‑chain live data returned by /api/agents/registered?load=true
  type LiveDataMap = Record<string, {
    nft_name?: string;
    owner?: string;
    agent_uri?: string;
    atom_enabled?: boolean;
    collection?: string;
    error?: string;
    // OASF capability domains if present on‑chain
    domains?: string[];
    // Verified A2A endpoint if advertised in the registry
    a2a_endpoint?: string | null;
  }>;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [recommendationReason, setRecommendationReason] = useState<string>("");
  const [agentsLiveData, setAgentsLiveData] = useState<LiveDataMap>({});
  const [agentsReputation, setAgentsReputation] = useState<Record<string, ReputationSummary | null>>({});

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [executionMode, setExecutionMode] = useState<"demo" | "live">("demo");
  const [confirmHire, setConfirmHire] = useState(false);

  // Load task history
  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => {
        setTasks(data.tasks ?? []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoadError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });

    // Load registered agents (independent of tasks)
    fetch("/api/agents/registered?load=true")
      .then((r) => r.json())
      .then((data) => {
        setAgents(data.records ?? []);
        setAgentsLiveData(data.liveData ?? {});
        setAgentsLoading(false);
      })
      .catch(() => setAgentsLoading(false));
  }, []);

  // Load reputation data for each agent after agents are loaded
  useEffect(() => {
    if (agentsLoading) return;
    let cancelled = false;
    const fetchReps = async () => {
      const reps: Record<string, ReputationSummary | null> = {};
      await Promise.all(
        agents.map(async (a) => {
          try {
            const res = await fetch(`/api/agents/reputation?agentId=${encodeURIComponent(a.agentId)}`);
            const data = await res.json();
            if (data.ok && data.summary) {
              reps[a.agentId] = data.summary;
            } else {
              reps[a.agentId] = null;
            }
          } catch {
            reps[a.agentId] = null;
          }
        })
      );
      if (!cancelled) setAgentsReputation(reps);
    };
    fetchReps();
    return () => {
      cancelled = true;
    };
  }, [agents, agentsLoading]);

  // Compute recommendation using reputation (or fallback) once data is ready
  useEffect(() => {
    if (agentsLoading) return;
    const agentsWithRep = agents.filter((a) => {
      const rep = agentsReputation[a.agentId];
      return rep && rep.totalFeedbacks && rep.totalFeedbacks > 0 && typeof rep.averageScore === 'number';
    });
    let recId = "";
    let reason = "";
    if (agentsWithRep.length > 0) {
      agentsWithRep.sort((a, b) => {
        const ra = agentsReputation[a.agentId];
        const rb = agentsReputation[b.agentId];
        const scoreDiff = (rb?.averageScore ?? 0) - (ra?.averageScore ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (rb?.totalFeedbacks ?? 0) - (ra?.totalFeedbacks ?? 0);
      });
      const best = agentsWithRep[0];
      const bestRep = agentsReputation[best.agentId];
      recId = best.agentId;
      reason = `Agent "${best.agentId}" selected based on reputation: avgScore ${bestRep?.averageScore ?? 0}, feedbacks ${bestRep?.totalFeedbacks ?? 0}, positives ${bestRep?.positiveCount ?? 0}, negatives ${bestRep?.negativeCount ?? 0}.`;
    } else {
      // Attempt capability‑based recommendation when reputation is unavailable
      let bestMatchAgentId = "";
      let bestMatchReason = "";
      const requiredSkills = CATEGORY_TO_SKILLS[category] ?? [];
      for (const a of agents) {
        const live = agentsLiveData[a.asset];
        const domains = live?.domains;
        if (Array.isArray(domains) && requiredSkills.length > 0) {
          const matched = requiredSkills.filter((s) => domains.includes(s));
          const missing = requiredSkills.filter((s) => !domains.includes(s));
          if (matched.length === requiredSkills.length) {
            // Full capability match
            bestMatchAgentId = a.agentId;
            bestMatchReason = `Agent "${a.agentId}" declares all required capabilities (${requiredSkills.join(', ')}).`; 
            break;
          } else if (matched.length > 0 && !bestMatchAgentId) {
            // Partial match – keep the first partial as fallback
            bestMatchAgentId = a.agentId;
            bestMatchReason = `Agent "${a.agentId}" partially matches required capabilities (matched: ${matched.join(', ')}, missing: ${missing.join(', ')}).`;
          }
        }
        // If no capability metadata, fall back to presence of an on‑chain A2A URI
        if (!bestMatchAgentId && live && live.agent_uri) {
          bestMatchAgentId = a.agentId;
          bestMatchReason = `Agent "${a.agentId}" reports an on‑chain A2A metadata URI (${live.agent_uri}), but capability metadata is unavailable; the task will run in simulated demo mode.`;
        }
      }
      if (bestMatchAgentId) {
        recId = bestMatchAgentId;
        reason = bestMatchReason;
      } else {
        reason = "No registered agents expose verified capabilities, A2A endpoint, or capability metadata; the task will run in simulated demo mode.";
      }
    }
    if (agents.length <= 1 && agentsWithRep.length === 0) {
      reason = "Only one agent is registered and no reputation data is available; a reliable comparative ranking cannot be established.";
    }
    setRecommendationReason(reason);
    if (!selectedAgentId) {
      setSelectedAgentId(recId);
    }
  }, [agents, agentsLiveData, agentsReputation, agentsLoading, selectedAgentId, category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, agentId: selectedAgentId || undefined, mode: executionMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setTasks((prev) => [data.task, ...prev]);
      setTitle("");
      setDescription("");
      setCategory("general");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeading>Submit a Task</SectionHeading>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Title</label>
            <input className="task-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Summarize a paper" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Description</label>
            <textarea className="task-textarea" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the task in detail…" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Category</label>
            <select className="task-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="research">Research / Summarization</option>
              <option value="coding">Code Review / Generation</option>
              <option value="analysis">Data Analysis</option>
              <option value="general">General Assistance</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Agent</label>
            {agentsLoading ? (
              <p className="text-sm text-[var(--text-muted)]">Loading agents…</p>
            ) : agents.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No registered agents. Register an agent first.</p>
            ) : (
              <select className="task-select" value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)}>
                <option value="">-- None (Demo) --</option>
                {agents.map((a) => (
                  <option key={a.agentId} value={a.agentId}>
                    {a.asset} ({a.agentId})
                  </option>
                ))}
              </select>
            )}
            {/* Selected agent details */}
            {selectedAgentId && (
              <div className="border rounded p-3 mb-4 text-sm text-[var(--text-muted)]">
                <p><strong>Agent ID:</strong> {selectedAgentId}</p>
                <p><strong>Asset:</strong> {agents.find((a) => a.agentId === selectedAgentId)?.asset ?? 'Unknown'}</p>
                <p><strong>Metadata URI:</strong> {agentsLiveData[agents.find((a) => a.agentId === selectedAgentId)?.asset ?? '']?.agent_uri || 'None'}</p>
                <p><strong>Declared capabilities:</strong> {agentsLiveData[agents.find((a) => a.agentId === selectedAgentId)?.asset ?? '']?.domains?.join(', ') || 'Unknown'}</p>
                <p><strong>Reputation:</strong> {(() => {
                  const rep = agentsReputation[selectedAgentId];
                  if (!rep || !rep.totalFeedbacks) return 'No reputation data available.';
                  const parts: string[] = [];
                  parts.push(`avg: ${rep.averageScore ?? 'N/A'}`);
                  parts.push(`feedbacks: ${rep.totalFeedbacks}`);
                  parts.push(`positives: ${rep.positiveCount ?? 'N/A'}`);
                  parts.push(`negatives: ${rep.negativeCount ?? 'N/A'}`);
                  return parts.join(', ');
                })()}</p>
                <p><strong>A2A endpoint:</strong> {agentsLiveData[agents.find((a) => a.agentId === selectedAgentId)?.asset ?? '']?.a2a_endpoint ? `Advertised (${agentsLiveData[agents.find((a) => a.agentId === selectedAgentId)?.asset ?? '']?.a2a_endpoint})` : 'Unknown'}</p>
                <p><strong>Capability match:</strong> {(() => {
                  const live = agentsLiveData[agents.find((a) => a.agentId === selectedAgentId)?.asset ?? ''];
                  const domains = live?.domains;
                  const requiredSkills = CATEGORY_TO_SKILLS[category] ?? [];
                  if (Array.isArray(domains) && requiredSkills.length > 0) {
                    const matched = requiredSkills.filter((s) => domains.includes(s));
                    const missing = requiredSkills.filter((s) => !domains.includes(s));
                    if (matched.length === requiredSkills.length) return `Full match (all required skills present)`;
                    if (matched.length > 0) return `Partial match – matched: ${matched.join(', ')}, missing: ${missing.join(', ')}`;
                    return 'No matching skills.';
                  }
                  return 'Capability match unknown (no capability metadata).';
                })()}</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">Execution Mode</label>
            <select className="task-select" value={executionMode} onChange={(e) => {
              const mode = e.target.value as "demo" | "live";
              setExecutionMode(mode);
              setConfirmHire(false);
            }}>
              <option value="demo">Demo (simulated)</option>
              <option value="live">Live Agent</option>
            </select>
            {executionMode === "live" && selectedAgentId && (
                <div className="mt-2">
                  <label className="inline-flex items-center">
                    <input type="checkbox" className="form-checkbox" checked={confirmHire} onChange={(e) => setConfirmHire(e.target.checked)} />
                    <span className="ml-2 text-sm text-[var(--text-muted)]">I confirm hiring and delegating to the selected agent</span>
                  </label>
                </div>
              )}
          </div>
          {selectedAgentId && (
            (() => {
              const rep = agentsReputation[selectedAgentId];
              if (!rep || !rep.totalFeedbacks || rep.totalFeedbacks === 0) {
                return (
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    No reputation data available.
                  </p>
                );
              }
              const parts: string[] = [];
              parts.push(`avg: ${rep.averageScore !== undefined ? rep.averageScore : 'Not available'}`);
              parts.push(`feedbacks: ${rep.totalFeedbacks !== undefined ? rep.totalFeedbacks : 'Not available'}`);
              parts.push(`positives: ${rep.positiveCount !== undefined ? rep.positiveCount : 'Not available'}`);
              parts.push(`negatives: ${rep.negativeCount !== undefined ? rep.negativeCount : 'Not available'}`);
              return (
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Reputation – {parts.join(', ')}
                </p>
              );
            })()
          )}
          {recommendationReason && (
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Recommendation: {recommendationReason}
            </p>
          )}
          {/* Display inferred required skills */}
          {CATEGORY_TO_SKILLS[category] && CATEGORY_TO_SKILLS[category].length > 0 && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Required skills: {CATEGORY_TO_SKILLS[category].join(', ')}
            </p>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn btn-primary btn-md w-full" disabled={submitting || (executionMode === "live" && selectedAgentId !== "" && !confirmHire)}>
            {submitting ? "Submitting…" : "Submit Task"}
          </button>
        </form>
      </Card>

      <Card>
        <SectionHeading>Recent Tasks</SectionHeading>
        {loadError && !loading ? (
          <div className="space-y-2">
            <p className="text-sm text-red-500">Error loading tasks: {loadError}</p>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              setLoading(true);
              setLoadError(null);
              fetch('/api/tasks')
                .then(r => r.json())
                .then(data => { setTasks(data.tasks ?? []); setLoading(false); })
                .catch(e => { console.error(e); setLoadError(e instanceof Error ? e.message : String(e)); setLoading(false); });
            }}>Retry</button>
          </div>
        ) : loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 8h6M5 5.5h4" strokeLinecap="round"/></svg>}
            title="No tasks yet"
            subtitle="Submit your first task."
          />
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => (
              <div key={t.id} className="border rounded p-3">
                <DataRow label="ID">{t.id}</DataRow>
                <DataRow label="Title">{t.title}</DataRow>
                <DataRow label="Category">{t.category}</DataRow>
                <DataRow label="Mode">{t.mode === "live" ? "Live Agent" : "Simulated Demo"}</DataRow>
                {t.agentId && <DataRow label="Agent">{t.agentId}</DataRow>}
                <DataRow label="Status">{t.status}</DataRow>
                {t.result && <DataRow label="Result">{t.result}</DataRow>}
                <DataRow label="Created">{new Date(t.createdAt).toLocaleString()}</DataRow>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
