import { NextRequest, NextResponse } from "next/server";
import { getFeedbackByTaskId } from "@/lib/feedbackStorage";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
): Promise<NextResponse> {
  const { taskId } = await params;

  if (!taskId || taskId === "[taskId]") {
    return NextResponse.json({ ok: false, error: "taskId required" }, { status: 400 });
  }

  const feedback = await getFeedbackByTaskId(taskId);
  return NextResponse.json({ ok: true, feedback });
}
