import { NextRequest, NextResponse } from "next/server";
import { saveFeedback, getFeedbackByTaskId, TaskFeedback } from "@/lib/feedbackStorage";
import { getFeedbackWriteSdk, isWriteConfigured } from "@/lib/registry";
import { PublicKey } from "@solana/web3.js";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

async function findAgentAsset(agentId: string): Promise<string | null> {
  const REGISTRY_FILE = path.join(process.cwd(), "data", "registered-agents.json");
  const FALLBACK_REGISTRY_FILE = path.join(__dirname, "../../../../data/registered-agents.json");
  try {
    let raw = "";
    try {
      raw = await fs.readFile(REGISTRY_FILE, "utf-8");
    } catch {
      raw = await fs.readFile(FALLBACK_REGISTRY_FILE, "utf-8");
    }
    const agentRecords: { agentId: string; asset: string }[] = JSON.parse(raw);
    const rec = agentRecords.find((r) => r.agentId === agentId);
    return rec ? rec.asset : null;
  } catch {
    return null;
  }
}

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
    postOnChain,
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
    postOnChain?: unknown;
  };

  // Validation
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

  const safeReview = typeof review === "string" ? review.trim().slice(0, 1000) : undefined;
  const safeTags = Array.isArray(tags) ? tags.filter((t) => typeof t === "string") : [];
  const shouldPostOnChain = Boolean(postOnChain);

  let txSignature: string | undefined;
  let explorerUrl: string | undefined;
  let onChainNote: string | undefined;

  // On-chain ATOM feedback submission
  if (shouldPostOnChain && agentId) {
    const assetStr = await findAgentAsset(agentId);
    if (assetStr && isWriteConfigured()) {
      try {
        const writeSdk = await getFeedbackWriteSdk();
        // Convert 1-5 rating into 0-100 score for ATOM engine
        const score = Math.round(overallRating * 20);
        const onChainRes = await writeSdk.giveFeedback(new PublicKey(assetStr), {
          score,
          value: score,
          tag1: safeTags[0] || (outcome === "successful" ? "quality" : "general"),
          tag2: outcome,
          endpoint: process.env.COORDINATOR_AGENT_ENDPOINT || "https://github.com/HackToBerFest-VVCE/t2c1-two-bits",
        });

        if (onChainRes && onChainRes.success && onChainRes.signature) {
          txSignature = onChainRes.signature;
          explorerUrl = `https://explorer.solana.com/tx/${onChainRes.signature}?cluster=devnet`;
          onChainNote = "Verified on Solana Devnet";
        } else if (onChainRes && onChainRes.error) {
          onChainNote = `On-chain note: ${onChainRes.error}`;
        }
      } catch (err) {
        console.warn("On-chain feedback transaction failed:", err);
        onChainNote = err instanceof Error ? err.message : "On-chain write error";
      }
    }
  }

  const existingFeedback = await getFeedbackByTaskId(taskId);
  const feedbackId = existingFeedback?.id ?? (crypto.randomUUID ? crypto.randomUUID() : `fb-${Date.now()}`);
  const createdAt = existingFeedback?.createdAt ?? new Date().toISOString();

  const feedbackRecord: TaskFeedback = {
    id: feedbackId,
    taskId,
    agentId,
    executionMode,
    overallRating,
    outcome,
    accuracy,
    quality,
    speed,
    review: safeReview,
    tags: safeTags,
    onChain: Boolean(txSignature),
    txSignature,
    explorerUrl,
    createdAt,
    updatedAt: new Date().toISOString(),
  };

  await saveFeedback(feedbackRecord);

  return NextResponse.json({
    ok: true,
    feedback: feedbackRecord,
    onChainNote,
  });
}
