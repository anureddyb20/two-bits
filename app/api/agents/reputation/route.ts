import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { PublicKey } from "@solana/web3.js";
import { getReadOnlySdk } from "@/lib/registry";

export const dynamic = "force-dynamic";

// Helper to load registration records (same as /api/agents/registered)
async function loadAgentRecords(): Promise<Array<{agentId:string; asset:string}>> {
  const REGISTRY_FILE = path.join(process.cwd(), "data", "registered-agents.json");
  const FALLBACK_REGISTRY_FILE = path.join(__dirname, "../../../data/registered-agents.json");
  try {
    const raw = await fs.readFile(REGISTRY_FILE, "utf-8");
    return JSON.parse(raw) as Array<{agentId:string; asset:string}>;
  } catch {
    try {
      const raw = await fs.readFile(FALLBACK_REGISTRY_FILE, "utf-8");
      return JSON.parse(raw) as Array<{agentId:string; asset:string}>;
    } catch {
      return [];
    }
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const agentId = request.nextUrl.searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.json({ ok: false, error: "Missing agentId query param" }, { status: 400 });
  }
  const records = await loadAgentRecords();
  const rec = records.find((r) => r.agentId === agentId);
  if (!rec) {
    return NextResponse.json({ ok: false, error: "Agent not found" }, { status: 404 });
  }

  const sdk = await getReadOnlySdk();
  let summary = null;
  try {
    summary = await sdk.getSummary(new PublicKey(rec.asset));
  } catch (e) {
    // If the SDK cannot fetch summary (e.g., indexer unavailable), keep null
    console.error("Failed to fetch reputation summary", e);
  }

  const hasData = summary && (summary.totalFeedbacks ?? 0) > 0;
  const response = {
    ok: true,
    agentId,
    asset: rec.asset,
    summary: summary ?? null,
    note: hasData ? "Reputation data retrieved from registry" : "No reputation data available for this agent",
  };
  return NextResponse.json(response);
}
