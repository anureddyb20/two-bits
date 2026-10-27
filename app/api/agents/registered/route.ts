/**
 * app/api/agents/registered/route.ts
 *
 * GET /api/agents/registered
 *
 * Returns registration records from data/registered-agents.json
 * plus a configuration readiness status.
 *
 * Also accepts GET /api/agents/registered?load=true to attempt live on-chain
 * reads via sdk.loadAgent() for each recorded asset.
 *
 * SECURITY: Never returns signer pubkey, raw key bytes, or PINATA_JWT.
 * The only credentials-related information returned is the boolean
 * { signerConfigured, ipfsConfigured } — no values, only presence flags.
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { ServiceType } from "8004-solana";
import { getReadOnlySdk, isSignerConfigured, isIpfsConfigured, PROGRAM_IDS, INDEXER_URL } from "@/lib/registry";

/* eslint-disable @typescript-eslint/no-explicit-any */

const REGISTRY_FILE = path.join(process.cwd(), "data", "registered-agents.json");
// In some environments (e.g., when running from a compiled .next directory),
// process.cwd() may point to the build folder. Fallback to the project root
// relative to this file if the primary path does not exist.
const FALLBACK_REGISTRY_FILE = path.join(__dirname, "../../../data/registered-agents.json");

type RegistrationRecord = {
  agentId: string;
  asset: string;
  signature: string;
  registeredAt: string;
  cluster: string;
};

async function loadRecords(): Promise<RegistrationRecord[]> {
  try {
    const raw = await fs.readFile(REGISTRY_FILE, "utf-8");
    return JSON.parse(raw) as RegistrationRecord[];
  } catch {
    // Try fallback location
    try {
      const raw = await fs.readFile(FALLBACK_REGISTRY_FILE, "utf-8");
      return JSON.parse(raw) as RegistrationRecord[];
    } catch {
      return [];
    }
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const loadLive = request.nextUrl.searchParams.get("load") === "true";

  const records = await loadRecords();

  const config = {
    signerConfigured: isSignerConfigured(),
    ipfsConfigured: isIpfsConfigured(),
    cluster: process.env.SOLANA_CLUSTER ?? "devnet",
    programIds: PROGRAM_IDS,
    indexerUrl: INDEXER_URL,
  };

  if (!loadLive) {
    return NextResponse.json({ ok: true, config, records, liveData: null });
  }

  // --- Discovery Phase ----------------------------------------------------
  // Try to fetch *all* agents from the on‑chain registry via the SDK.
  // getAllAgents() returns every registered AgentAccount with metadata.
  // It throws UnsupportedRpcError if the underlying RPC does not support getProgramAccounts.
  // In that case we fall back to the legacy per‑record enrichment.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onChainAgents = [] as any[]; // generic for now
  let discoveryError: string | null = null;
  try {
    const sdk = await getReadOnlySdk();
    onChainAgents = await sdk.getAllAgents();
  } catch (e: unknown) {
    discoveryError = e instanceof Error ? e.message : String(e);
  }

  // Build a combined map keyed by asset (canonical base58 address).
  const combined = new Map<string, {
    source: "local" | "onChain";
    record?: { agentId: string; asset: string };
    liveInfo: any;
  }>();

  // Add local records first.
  for (const rec of records) {
    combined.set(rec.asset, {
      source: "local",
      record: rec,
      liveInfo: {},
    });
  }

  // Helper to extract live info from an AgentAccount (reuse existing logic).
  const extractLiveInfo = (agent: any) => {
    return {
      nft_name: agent.nft_name,
      owner: agent.getOwnerPublicKey().toBase58(),
      agent_uri: agent.agent_uri,
      atom_enabled: agent.isAtomEnabled?.(),
      collection: agent.getCollectionPublicKey?.()?.toBase58(),
      domains: (agent as unknown as { domains?: unknown }).domains,
      a2a_endpoint: (function () {
        const services = (agent as unknown as { services?: unknown }).services;
        if (Array.isArray(services)) {
          const svc = (services as unknown[]).find((s) => {
            const obj = s as { type?: unknown; value?: unknown };
            return obj.type === ServiceType.A2A && typeof obj.value === "string" && /^https?:\/\//i.test(obj.value as string);
          }) as { value: string } | undefined;
          return svc ? svc.value : null;
        }
        return null;
      })(),
    };
  };

  // Merge on‑chain agents.
  for (const on of onChainAgents) {
    const asset = on.account.getAssetPublicKey().toBase58();
    const existing = combined.get(asset);
    const liveInfo = extractLiveInfo(on.account);
    if (existing) {
      // Preserve the local record, just add liveInfo.
      existing.liveInfo = liveInfo;
    } else {
      combined.set(asset, { source: "onChain", liveInfo, record: undefined });
    }
  }

  // Assemble the response structures expected by the client.
  const liveData: Record<string, any> = {};
  for (const [asset, entry] of combined.entries()) {
    liveData[asset] = entry.liveInfo;
  }

  // Include discovered agents for UI awareness (optional).
  const discovered = onChainAgents.map((a: any) => ({
    agentId: a.account?.agent_id?.toBase58?.() ?? "",
    asset: a.account?.getAssetPublicKey?.().toBase58?.() ?? "",
  }));

  return NextResponse.json({
    ok: true,
    config,
    records,
    discovered,
    liveData,
    warning: discoveryError,
  });
}
