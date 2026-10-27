import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const taskId = searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ ok: false, error: "taskId query param required" }, { status: 400 });
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("feedback").select("*", { count: "exact" }).eq("task_id", taskId).single();
  if (error) {
    if (error.code === "PGRST116") { // row not found
      return NextResponse.json({ ok: true, feedback: null });
    }
    console.error("Supabase fetch error", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch feedback" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, feedback: data });
}
