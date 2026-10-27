import { NextResponse } from "next/server";
import { loadFeedbacks } from "@/lib/feedbackStorage";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const feedbacks = await loadFeedbacks();
  return NextResponse.json({ ok: true, feedbacks });
}
