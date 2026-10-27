import { NextResponse } from "next/server";
import { loadFeedbacks } from "@/lib/feedbackStorage";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const feedbacks = await loadFeedbacks();
    return NextResponse.json({ ok: true, feedbacks });
  } catch (err: unknown) {
    console.error("[/api/feedback/list] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err), feedbacks: [] },
      { status: 500 }
    );
  }
}
