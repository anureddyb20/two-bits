import { promises as fs } from "fs";
import path from "path";
import { getSupabaseClient } from "@/lib/supabase";

export interface TaskFeedback {
  id: string;
  taskId: string;
  agentId?: string;
  executionMode: "demo" | "live";
  overallRating: number; // 1 to 5
  outcome: "successful" | "partial" | "unsuccessful";
  accuracy: number; // 1 to 5
  quality: number; // 1 to 5
  speed: number; // 1 to 5
  review?: string;
  tags: string[];
  onChain?: boolean;
  txSignature?: string;
  explorerUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");
const FALLBACK_FEEDBACK_FILE = path.join(__dirname, "../../../data/feedback.json");

/**
 * Loads all feedback records from disk and optionally Supabase.
 */
export async function loadFeedbacks(): Promise<TaskFeedback[]> {
  try {
    const raw = await fs.readFile(FEEDBACK_FILE, "utf-8");
    return JSON.parse(raw) as TaskFeedback[];
  } catch {
    try {
      const raw = await fs.readFile(FALLBACK_FEEDBACK_FILE, "utf-8");
      return JSON.parse(raw) as TaskFeedback[];
    } catch {
      return [];
    }
  }
}

/**
 * Saves the full feedback list to disk.
 */
export async function persistFeedbacks(feedbacks: TaskFeedback[]): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2), "utf-8");
  } catch {
    const fallbackDir = path.join(__dirname, "../../../data");
    await fs.mkdir(fallbackDir, { recursive: true });
    await fs.writeFile(path.join(fallbackDir, "feedback.json"), JSON.stringify(feedbacks, null, 2), "utf-8");
  }
}

/**
 * Retrieves feedback for a specific task ID.
 */
export async function getFeedbackByTaskId(taskId: string): Promise<TaskFeedback | null> {
  const all = await loadFeedbacks();
  const match = all.find((f) => f.taskId === taskId);
  if (match) return match;

  // Optional Supabase fallback
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .eq("task_id", taskId)
      .maybeSingle();

    if (data) {
      return {
        id: data.id,
        taskId: data.task_id,
        agentId: data.agent_id,
        executionMode: data.execution_mode ?? "demo",
        overallRating: data.overall_rating ?? 5,
        outcome: data.outcome ?? "successful",
        accuracy: data.accuracy_rating ?? 5,
        quality: data.quality_rating ?? 5,
        speed: data.speed_rating ?? 5,
        review: data.review ?? undefined,
        tags: data.tags ?? [],
        onChain: Boolean(data.tx_signature),
        txSignature: data.tx_signature,
        explorerUrl: data.tx_signature
          ? `https://explorer.solana.com/tx/${data.tx_signature}?cluster=devnet`
          : undefined,
        createdAt: data.created_at ?? new Date().toISOString(),
      };
    }
  } catch {
    // Ignore Supabase missing table or connection issues
  }

  return null;
}

/**
 * Saves a new feedback record or updates an existing one for the same task.
 */
export async function saveFeedback(feedback: TaskFeedback): Promise<TaskFeedback> {
  const all = await loadFeedbacks();
  const existingIndex = all.findIndex((f) => f.taskId === feedback.taskId);

  if (existingIndex >= 0) {
    all[existingIndex] = {
      ...all[existingIndex],
      ...feedback,
      updatedAt: new Date().toISOString(),
    };
  } else {
    all.unshift(feedback);
  }

  await persistFeedbacks(all);

  // Attempt async sync to Supabase if table exists
  try {
    const supabase = getSupabaseClient();
    await supabase.from("feedback").upsert({
      id: feedback.id,
      task_id: feedback.taskId,
      agent_id: feedback.agentId ?? null,
      execution_mode: feedback.executionMode,
      overall_rating: feedback.overallRating,
      outcome: feedback.outcome,
      accuracy_rating: feedback.accuracy,
      quality_rating: feedback.quality,
      speed_rating: feedback.speed,
      review: feedback.review ?? null,
      tags: feedback.tags,
      tx_signature: feedback.txSignature ?? null,
      created_at: feedback.createdAt,
    });
  } catch {
    // Graceful fallback: local persistence is already confirmed
  }

  return feedback;
}

/**
 * Retrieves all feedback for a given agentId.
 */
export async function getFeedbacksByAgentId(agentId: string): Promise<TaskFeedback[]> {
  const all = await loadFeedbacks();
  return all.filter((f) => f.agentId === agentId);
}
