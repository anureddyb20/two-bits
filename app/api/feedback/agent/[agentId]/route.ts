import { NextRequest, NextResponse } from "next/server";
import { getFeedbacksByAgentId } from "@/lib/feedbackStorage";

export const dynamic = "force-dynamic";

/**
 * GET /api/feedback/agent/:agentId
 * Returns summary and recent feedback for an agent.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse> {
  const { agentId } = await params;

  if (!agentId || agentId === "[agentId]") {
    return NextResponse.json({ ok: false, error: "agentId missing" }, { status: 400 });
  }

  const feedbackList = await getFeedbacksByAgentId(agentId);

  if (!feedbackList || feedbackList.length === 0) {
    return NextResponse.json({ ok: true, summary: null, recent: [] });
  }

  const total = feedbackList.length;
  const sumOverall = feedbackList.reduce((sum, f) => sum + (f.overallRating ?? 0), 0);
  const avgOverall = sumOverall / total;
  const outcomeCounts: Record<string, number> = { successful: 0, partial: 0, unsuccessful: 0 };
  let sumAccuracy = 0;
  let sumQuality = 0;
  let sumSpeed = 0;

  feedbackList.forEach((f) => {
    const o = f.outcome;
    if (outcomeCounts[o] !== undefined) outcomeCounts[o]++;
    sumAccuracy += f.accuracy ?? 0;
    sumQuality += f.quality ?? 0;
    sumSpeed += f.speed ?? 0;
  });

  const successRate = (outcomeCounts["successful"] / total) * 100;
  const avgAccuracy = sumAccuracy / total;
  const avgQuality = sumQuality / total;
  const avgSpeed = sumSpeed / total;

  // Recent 5 feedbacks
  const recent = [...feedbackList]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return NextResponse.json({
    ok: true,
    summary: {
      averageOverallRating: avgOverall,
      totalFeedbacks: total,
      successRate,
      averageAccuracy: avgAccuracy,
      averageQuality: avgQuality,
      averageSpeed: avgSpeed,
    },
    recent,
  });
}
