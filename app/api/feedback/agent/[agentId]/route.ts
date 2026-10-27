import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/feedback/agent/:agentId
 * Returns summary and recent feedback for a real agent (exclude demo feedback).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const parts = pathname.split("/");
  const agentId = parts[parts.length - 1];
  if (!agentId) {
    return NextResponse.json({ ok: false, error: "agentId missing" }, { status: 400 });
  }
  const supabase = getSupabaseClient();
  // Fetch all feedback for this agent where execution_mode = 'live'
  const { data: feedback, error } = await supabase
    .from("feedback")
    .select("overall_rating, outcome, accuracy_rating, quality_rating, created_at")
    .eq("agent_id", agentId)
    .eq("execution_mode", "live");

  if (error) {
    console.error("Supabase fetch error", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch feedback" }, { status: 500 });
  }

  if (!feedback || feedback.length === 0) {
    return NextResponse.json({ ok: true, summary: null, recent: [] });
  }

  const total = feedback.length;
  const sumOverall = feedback.reduce((sum, f) => sum + (f.overall_rating ?? 0), 0);
  const avgOverall = sumOverall / total;
  const outcomeCounts: Record<string, number> = { successful: 0, partial: 0, unsuccessful: 0 };
  let sumAccuracy = 0;
  let sumQuality = 0;
  feedback.forEach((f) => {
    const o = f.outcome as string;
    if (outcomeCounts[o] !== undefined) outcomeCounts[o]++;
    sumAccuracy += f.accuracy_rating ?? 0;
    sumQuality += f.quality_rating ?? 0;
  });
  const successRate = (outcomeCounts["successful"] / total) * 100;
  const avgAccuracy = sumAccuracy / total;
  const avgQuality = sumQuality / total;

  // recent 5 feedback entries (sorted newest)
  const recent = feedback
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return NextResponse.json({
    ok: true,
    summary: {
      averageOverallRating: avgOverall,
      totalFeedbacks: total,
      successRate,
      averageAccuracy: avgAccuracy,
      averageQuality: avgQuality,
    },
    recent,
  });
}
