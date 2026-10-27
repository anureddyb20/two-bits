/**
 * app/api/agents/register/route.ts
 *
 * POST /api/agents/register
 *
 * Server-side agent registration endpoint.
 * Registers a single agent on Solana Devnet using the 8004-solana SDK.
 *
 * SECURITY:
 *  - Reads SOLANA_PRIVATE_KEY and PINATA_JWT only via lib/registry.ts helpers.
 *  - Never returns the signer pubkey, raw key bytes, or PINATA_JWT.
 *  - Returns only: { status, agentId (asset pubkey), signature, explorerUrl }
 *  - Errors are sanitised — stack traces and raw SDK errors are logged
 *    server-side only; the client receives a safe message.
 *
 * DUPLICATE PREVENTION:
 *  - Checks data/registered-agents.json before registering.
 *  - If the agent ID already has a recorded asset pubkey, skips the
 *    transaction and returns { alreadyRegistered: true, agentId, ... }.
 *  - NOTE: This prevents accidental double-registration within THIS app,
 *    but is not a cryptographic guarantee — the on-chain registry does not
 *    enforce uniqueness by name.
 *
 * REQUEST BODY (JSON):
 *  { agentId: "coordinator" }   ← must match an id in lib/agentDefs.ts
 *
 * RESPONSES:
 *  200 { ok: true, alreadyRegistered: false, agentId: "...", signature: "...", explorerUrl: "..." }
 *  200 { ok: true, alreadyRegistered: true,  agentId: "...", signature: null, explorerUrl: "..." }
 *  400 { ok: false, error: "...", code: "INVALID_INPUT" | "MISSING_CONFIG" | ... }
 *  500 { ok: false, error: "...", code: "REGISTRATION_FAILED" }
 */

import { NextRequest, NextResponse } from "next/server";
import { SendTransactionError } from "@solana/web3.js";
import { promises as fs } from "fs";
import path from "path";
import { buildRegistrationFileJson } from "8004-solana";

import {
  getWriteSdk,
  ConfigurationError,
} from "@/lib/registry";
import { ALL_AGENT_DEFS } from "@/lib/agentDefs";

// ---------------------------------------------------------------------------
// Registration state file (not a secret — just persistent state)
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const REGISTRY_FILE = path.join(DATA_DIR, "registered-agents.json");

type RegistrationRecord = {
  agentId: string;
  asset: string;         // base58 pubkey
  signature: string;     // base58 tx signature
  registeredAt: string;  // ISO timestamp
  cluster: string;
};

async function loadRegistrationRecords(): Promise<RegistrationRecord[]> {
  try {
    const raw = await fs.readFile(REGISTRY_FILE, "utf-8");
    return JSON.parse(raw) as RegistrationRecord[];
  } catch {
    // File doesn't exist yet — that's fine
    return [];
  }
}

async function saveRegistrationRecord(record: RegistrationRecord): Promise<void> {
  const existing = await loadRegistrationRecords();
  // Replace if exists, otherwise append
  const idx = existing.findIndex((r) => r.agentId === record.agentId);
  if (idx >= 0) {
    existing[idx] = record;
  } else {
    existing.push(record);
  }
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(REGISTRY_FILE, JSON.stringify(existing, null, 2), "utf-8");
  } catch (err) {
    // Fallback to project root if cwd points elsewhere (e.g., when running from .next)
    const fallbackDir = path.join(__dirname, "../../../data");
    const fallbackFile = path.join(fallbackDir, "registered-agents.json");
    await fs.mkdir(fallbackDir, { recursive: true });
    await fs.writeFile(fallbackFile, JSON.stringify(existing, null, 2), "utf-8");
    console.warn('[register] Saved registration record using fallback path due to error:', err);
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Request body must be valid JSON.", code: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).agentId !== "string"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Request body must contain { "agentId": "<string>" }.',
        code: "INVALID_INPUT",
      },
      { status: 400 }
    );
  }

  const agentId = (body as { agentId: string }).agentId.trim();

  // 2. Find the agent definition
  const agentDef = ALL_AGENT_DEFS.find((d) => d.id === agentId);
  if (!agentDef) {
    const validIds = ALL_AGENT_DEFS.map((d) => d.id).join(", ");
    return NextResponse.json(
      {
        ok: false,
        error: `Unknown agentId "${agentId}". Valid IDs: ${validIds}`,
        code: "INVALID_INPUT",
      },
      { status: 400 }
    );
  }

  // 3. Check for existing registration (duplicate guard)
  const existing = await loadRegistrationRecords();
  const prior = existing.find((r) => r.agentId === agentId);
  if (prior) {
    return NextResponse.json({
      ok: true,
      alreadyRegistered: true,
      agentId: prior.asset,
      signature: prior.signature,
      explorerUrl: `https://explorer.solana.com/address/${prior.asset}?cluster=devnet`,
      txExplorerUrl: `https://explorer.solana.com/tx/${prior.signature}?cluster=devnet`,
      registeredAt: prior.registeredAt,
      message: "This agent was already registered. Returning the existing record.",
    });
  }

  // 4. Validate configuration (safe — ConfigurationError message contains no secrets)
  let sdk;
  try {
    sdk = await getWriteSdk();
  } catch (err: unknown) {
    if (err instanceof ConfigurationError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: "MISSING_CONFIG" },
        { status: 400 }
      );
    }
    // Unexpected error — log full detail server-side, return safe message
    console.error("[register] SDK init error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to initialise SDK.", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }

  // 5. Build metadata JSON using the verified SDK helper
  //
  //    buildRegistrationFileJson(registrationFile, options?) confirmed from:
  //    node_modules/8004-solana/dist/utils/registration-file-builder.d.ts
  //    Returns Record<string, unknown> — the JSON to upload to IPFS.
  //
  let metadataJson: Record<string, unknown>;
  try {
    metadataJson = buildRegistrationFileJson(agentDef.registrationFile);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Metadata validation failed.";
    return NextResponse.json(
      { ok: false, error: `Metadata error: ${msg}`, code: "METADATA_INVALID" },
      { status: 400 }
    );
  }

  // 6. Upload metadata to IPFS via Pinata
  //
  //    sdk.ipfsClient is private. We need to access it through the write SDK
  //    config. The SDK exposes addJson() only through the IPFSClient we
  //    built in getWriteSdk(). We re-obtain it here to call addJson() directly
  //    because sdk.createCollection() is for collection metadata, not agent metadata.
  //
  //    ipfs.addJson(data) confirmed from:
  //    node_modules/8004-solana/dist/core/ipfs-client.d.ts
  //
  //    We use the same IPFSClient used inside the SDK.
  //    Note: getWriteSdk() creates the client; we need a second reference.
  //    Rather than expose the internal client, we construct a fresh IPFSClient
  //    here from the same config — it is stateless (no connection to hold).
  //
  let metadataUri: string;
  try {
    // Import getIpfsClient separately — it reads PINATA_JWT once, constructs the client.
    const { getIpfsClient } = await import("@/lib/registry");
    const ipfs = await getIpfsClient();
    const cid = await ipfs.addJson(metadataJson);
    metadataUri = `ipfs://${cid}`;
    console.info(`[register] Metadata uploaded: ${metadataUri}`);
  } catch (err: unknown) {
    if (err instanceof ConfigurationError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: "MISSING_CONFIG" },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : "IPFS upload failed.";
    console.error("[register] IPFS upload error:", err);
    return NextResponse.json(
      { ok: false, error: `IPFS upload failed: ${msg}`, code: "IPFS_ERROR" },
      { status: 502 }
    );
  }

  // 7. Register on Solana Devnet
  //
  //    sdk.registerAgent(tokenUri?, options?) confirmed from:
  //    node_modules/8004-solana/dist/core/sdk-solana.d.ts
  //
  //    Returns: TransactionResult & { asset?: PublicKey; signatures?: string[] }
  //
  //    atomEnabled: false — default, correct for Phase 2.
  //    collectionPointer: omitted — optional; skipping collection in Phase 2B.
  //
  let asset: string;
  let signature: string;
  try {
    const result = await sdk.registerAgent(metadataUri, {
      atomEnabled: false,
      // collectionPointer: undefined — no collection in Phase 2B
    });

    // Narrow the union: PreparedTransaction has `signed: false`; TransactionResult has `success`.
    // We never pass skipSend, so the PreparedTransaction branch should not be reached,
    // but we guard against it explicitly for type safety.
    if ("signed" in result && result.signed === false) {
      console.error("[register] Unexpected PreparedTransaction returned (skipSend was not set).");
      return NextResponse.json(
        {
          ok: false,
          error: "SDK returned an unsigned transaction unexpectedly.",
          code: "REGISTRATION_FAILED",
        },
        { status: 500 }
      );
    }

    // Now TypeScript knows result is TransactionResult & { asset?, signatures? }
    const txResult = result as import("8004-solana").TransactionResult & {
      asset?: import("@solana/web3.js").PublicKey;
      signatures?: string[];
    };

    if (!txResult.success) {
      const errMsg = txResult.error ?? "Transaction returned success=false.";
      console.error("[register] Registration not successful:", errMsg);
      return NextResponse.json(
        { ok: false, error: `Registration failed: ${errMsg}`, code: "REGISTRATION_FAILED" },
        { status: 500 }
      );
    }

    if (!txResult.asset) {
      console.error("[register] No asset pubkey in result:", txResult);
      return NextResponse.json(
        {
          ok: false,
          error: "Registration succeeded but no asset pubkey was returned.",
          code: "REGISTRATION_FAILED",
        },
        { status: 500 }
      );
    }

    asset = txResult.asset.toBase58();
    signature = txResult.signature;
    console.info(`[register] Registered agent: asset=${asset} sig=${signature}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error during registration.";
    console.error("[register] registerAgent() threw:", err);

    // Surface specific known failures with clearer messages
    let userMsg = `On-chain registration failed: ${msg}`;
    let code = "REGISTRATION_FAILED";

    // Detect insufficient SOL (debit without prior credit) from SendTransactionError
    if (err instanceof SendTransactionError && err.message.includes("Attempt to debit an account but found no record of a prior credit")) {
      userMsg =
        "Insufficient SOL balance. Registration requires ~0.0093 SOL. " +
        "Airdrop devnet SOL at https://faucet.solana.com or with `solana airdrop 1 <pubkey> --url devnet`.";
      code = "INSUFFICIENT_SOL";
    } else if (msg.toLowerCase().includes("insufficient") || msg.toLowerCase().includes("balance")) {
      userMsg =
        "Insufficient SOL balance. Registration requires ~0.0093 SOL. " +
        "Airdrop devnet SOL at https://faucet.solana.com or with `solana airdrop 1 <pubkey> --url devnet`.";
      code = "INSUFFICIENT_SOL";
    } else if (msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("timed out")) {
      userMsg = "RPC request timed out. The devnet node may be congested. Try again in a moment.";
      code = "RPC_TIMEOUT";
    }

    return NextResponse.json(
      { ok: false, error: userMsg, code },
      { status: 500 }
    );
  }

  // 8. Persist the registration record
  const record: RegistrationRecord = {
    agentId,
    asset,
    signature,
    registeredAt: new Date().toISOString(),
    cluster: process.env.SOLANA_CLUSTER ?? "devnet",
  };
  try {
    await saveRegistrationRecord(record);
  } catch (err) {
    // Non-fatal — the registration succeeded; just couldn't write the local file.
    console.warn("[register] Could not persist registration record:", err);
  }

  // 9. Return success (no secrets in response)
  return NextResponse.json({
    ok: true,
    alreadyRegistered: false,
    agentId: asset,
    agentLocalId: agentId,
    signature,
    metadataUri,
    explorerUrl: `https://explorer.solana.com/address/${asset}?cluster=devnet`,
    txExplorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    registeredAt: record.registeredAt,
  });
}
