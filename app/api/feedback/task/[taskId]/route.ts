import { NextRequest, NextResponse } from "next/server";
import { getFeedbackByTaskId } from "@/lib/feedbackStorage";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context?: { params?: Promise<{ taskId: string }> | { taskId: string } }
): Promise<NextResponse> {
  let taskId: string | undefined;

  if (context?.params) {
    const resolvedParams = await context.params;
    taskId = resolvedParams?.taskId;
  }

  if (!taskId) {
    taskId = request.nextUrl.searchParams.get("taskId") || undefined;
  }

  // Fallback: extract from URL path
  if (!taskId) {
    const segments = request.nextUrl.pathname.split("/").filter(Boolean);
    taskId = segments[segments.length - 1];
  }

  if (!taskId || taskId === "[taskId]") {
    return NextResponse.json({ ok: false, error: "taskId required" }, { status: 400 });
  }

  const feedback = await getFeedbackByTaskId(taskId);
  return NextResponse.json({ ok: true, feedback });
}
