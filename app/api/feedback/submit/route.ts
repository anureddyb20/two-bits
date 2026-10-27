import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

/**
 * POST /api/feedback/submit
 * Body:
 *   {
 *     taskId: string,
 *     agentId?: string,
 *     executionMode: "demo" | "live",
 *     overallRating: number (1-5),
 *     outcome: "successful" | "partial" | "unsuccessful",
 *     accuracy: number (1-5),
 *     quality: number (1-5),
 *     speed: number (1-5),
 *     review?: string,
 *     tags?: string[]
 *   }
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
  const {
    taskId,
    agentId,
    executionMode,
    overallRating,
    outcome,
    accuracy,
    quality,
    speed,
    review,
    tags,
  } = body as {
    taskId?: unknown;
    agentId?: unknown;
    executionMode?: unknown;
    overallRating?: unknown;
    outcome?: unknown;
    accuracy?: unknown;
    quality?: unknown;
    speed?: unknown;
    review?: unknown;
    tags?: unknown;
  };

  // Basic validation
  if (
    typeof taskId !== "string" ||
    (agentId !== undefined && typeof agentId !== "string") ||
    (executionMode !== "demo" && executionMode !== "live") ||
    typeof overallRating !== "number" ||
    overallRating < 1 ||
    overallRating > 5 ||
    (outcome !== "successful" && outcome !== "partial" && outcome !== "unsuccessful") ||
    typeof accuracy !== "number" ||
    accuracy < 1 ||
    accuracy > 5 ||
    typeof quality !== "number" ||
    quality < 1 ||
    quality > 5 ||
    typeof speed !== "number" ||
    speed < 1 ||
    speed > 5
  ) {
    return NextResponse.json({ ok: false, error: "Invalid or missing fields" }, { status: 400 });
  }
  // Optional fields
  const safeReview = typeof review === "string" ? review.slice(0, 1000) : null;
  const safeTags = Array.isArray(tags) ? tags.filter((t) => typeof t === "string") : [];

  // Prevent duplicate feedback for same task
  const supabase = getSupabaseClient();
  const { data: existing, error: existingErr } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId);
  if (existingErr) {
    console.error("Supabase error fetching existing feedback", existingErr);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
  if ((existing?.length ?? 0) > 0) {
    return NextResponse.json({ ok: false, error: "Feedback already submitted for this task" }, { status: 409 });
  }

  // Insert feedback
  const { error: insertErr } = await supabase.from("feedback").insert({
    task_id: taskId,
    agent_id: agentId ?? null,
    execution_mode: executionMode,
    overall_rating: overallRating,
    outcome,
    accuracy_rating: accuracy,
    quality_rating: quality,
    speed_rating: speed,
    review: safeReview,
    tags: safeTags,
  });
  if (insertErr) {
    console.error("Supabase insert error", insertErr);
    return NextResponse.json({ ok: false, error: "Failed to save feedback" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
