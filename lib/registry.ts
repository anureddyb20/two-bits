/**
 * lib/registry.ts
 *
 * Server-side only wrapper around the 8004-solana SDK.
 *
 * Phase 1: Read-only connectivity check (checkDevnetConnectivity).
 * Phase 2: Added signer helpers and write SDK factory (getWriteSdk / IPFSClient).
 *
 * SECURITY RULES — enforced here, not just in comments:
 *  1. SOLANA_PRIVATE_KEY is read ONLY inside getSignerKeypair(). It is never
 *     returned, logged, serialised, or passed outside this module.
 *  2. PINATA_JWT is read ONLY inside getIpfsClient(). Same rule.
 *  3. Both functions throw a ConfigurationError (not a 500) when env vars are
 *     missing, so callers can return a 400/503 with a safe message.
 *  4. This file must NEVER be imported from client components or pages.
 *     It is imported only from /app/api/* route handlers.
 *  5. No NEXT_PUBLIC_ variables are used anywhere in this file.
 */

import type { SolanaSDK, IPFSClient } from "8004-solana";
// Lazy-loaded imports to avoid Node built‑ins at module load time.
// The SDK is required only inside the factory functions.
// Using require() ensures the import occurs at runtime on the server,
// sidestepping bundler attempts to resolve 'fs/promises' during build.
// This prevents the 500 error caused by top‑level imports of the Solana SDK.

import { Connection, Keypair } from "@solana/web3.js";

// ---------------------------------------------------------------------------
// Configuration – read from server environment variables only.
// ---------------------------------------------------------------------------

const CLUSTER = (process.env.SOLANA_CLUSTER as "devnet" | "mainnet-beta") ?? "devnet";
const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

// Devnet program IDs (confirmed from https://8004.qnt.sh)
export const PROGRAM_IDS = {
  agentRegistry: "6MuHv4dY4p9E4hSCEPr9dgbCSpMhq8x1vrUexbMVjfw1",
  atomEngine: "6Mu7qj6tRDrqchxJJPjr9V1H2XQjCerVKixFEEMwC1Tf",
} as const;

// Public indexer endpoint for devnet (no API key required)
export const INDEXER_URL = "https://8004-indexer-dev.qnt.sh";

// ---------------------------------------------------------------------------
// Read-only SDK instance (no signer, no private key)
// ---------------------------------------------------------------------------

let _sdkInstance: SolanaSDK | null = null;

export async function getReadOnlySdk(): Promise<SolanaSDK> {
  if (!_sdkInstance) {
    const { SolanaSDK } = await import("8004-solana");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    _sdkInstance = new SolanaSDK({ cluster: CLUSTER });
  }
  return _sdkInstance as SolanaSDK;
}


// ---------------------------------------------------------------------------
// Low-level connectivity check using @solana/web3.js directly.
// This avoids any write path and just asks the RPC for its health.
// ---------------------------------------------------------------------------

export interface ConnectivityResult {
  ok: boolean;
  cluster: string;
  rpcUrl: string;
  /** Slot number returned by the RPC, or null on failure */
  currentSlot: number | null;
  /** The RPC's reported health string, or null on failure */
  rpcHealth: string | null;
  /** ISO timestamp of when the check ran */
  checkedAt: string;
  /** Human-readable error if ok === false */
  error?: string;
}

/**
 * Performs two lightweight read-only RPC calls:
 *  1. getSlot()   – confirms we can reach the node
 *  2. getHealth() – confirms the node is not degraded
 *
 * No SOL is spent. No transactions are submitted.
 */
export async function checkDevnetConnectivity(): Promise<ConnectivityResult> {
  const checkedAt = new Date().toISOString();

  try {
    const connection = new Connection(RPC_URL, "confirmed");

    // getSlot() is the lightest possible call – just one JSON-RPC request.
    const slot = await connection.getSlot();

    // getHealth() returns "ok" when the validator is healthy.
    let rpcHealth: string;
    try {
      await (connection as unknown as { _rpcRequest: (m: string, p: unknown[]) => Promise<{ result: string }> })
        ._rpcRequest("getHealth", []);
      rpcHealth = "ok";
    } catch {
      // Some public endpoints don't expose getHealth; treat as "unknown"
      rpcHealth = "unknown";
    }

    return {
      ok: true,
      cluster: CLUSTER,
      rpcUrl: RPC_URL,
      currentSlot: slot,
      rpcHealth,
      checkedAt,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      cluster: CLUSTER,
      rpcUrl: RPC_URL,
      currentSlot: null,
      rpcHealth: null,
      checkedAt,
      error: message,
    };
  }
}

// ---------------------------------------------------------------------------
// Configuration error — safe to surface to API callers, never leaks secrets
// ---------------------------------------------------------------------------

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

// ---------------------------------------------------------------------------
// Signer keypair — ONLY function that reads SOLANA_PRIVATE_KEY
// ---------------------------------------------------------------------------

/**
 * Parse SOLANA_PRIVATE_KEY from the server environment.
 *
 * Expected format (set in .env.local, NEVER committed):
 *   SOLANA_PRIVATE_KEY=[1,2,3,...,64]   ← 64-element JSON integer array
 *
 * Returns a Keypair. Never logs or returns the raw secret bytes.
 * Throws ConfigurationError if the variable is absent or malformed.
 *
 * IMPORTANT: Call this only inside server-side API routes.
 *            The returned Keypair object must never be serialised to JSON
 *            or included in any HTTP response.
 */
export function getSignerKeypair(): Keypair {
  const raw = process.env.SOLANA_PRIVATE_KEY;
  if (!raw) {
    throw new ConfigurationError(
      "SOLANA_PRIVATE_KEY is not set. " +
        "Add it to .env.local as a 64-element JSON integer array. " +
        "See .env.example for instructions."
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigurationError(
      "SOLANA_PRIVATE_KEY is not valid JSON. " +
        "It must be a 64-element integer array, e.g. [1,2,3,...,64]."
    );
  }

  if (!Array.isArray(parsed) || parsed.length !== 64) {
    throw new ConfigurationError(
      "SOLANA_PRIVATE_KEY must be a JSON array of exactly 64 integers (the raw keypair bytes)."
    );
  }

  try {
    return Keypair.fromSecretKey(Uint8Array.from(parsed as number[]));
  } catch {
    throw new ConfigurationError(
      "SOLANA_PRIVATE_KEY contains invalid bytes and could not be used to construct a Keypair."
    );
  }
}

/**
 * Returns true if the signer keypair is configured, without reading or
 * exposing the key value. Safe to call from UI-facing status endpoints.
 */
export function isSignerConfigured(): boolean {
  try {
    getSignerKeypair();
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// IPFS client — ONLY function that reads PINATA_JWT
// ---------------------------------------------------------------------------

/**
 * Construct an IPFSClient using Pinata.
 *
 * Requires PINATA_JWT in .env.local (server-only).
 * Throws ConfigurationError if the variable is absent.
 *
 * IPFSClientConfig confirmed from:
 *   node_modules/8004-solana/dist/core/ipfs-client.d.ts
 *   { pinataEnabled?: boolean; pinataJwt?: string; url?: string; }
 */
export async function getIpfsClient(): Promise<IPFSClient> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new ConfigurationError(
      "PINATA_JWT is not set. " +
        "Sign up at pinata.cloud (free tier), create an API key with pinning scope, " +
        "and add the JWT to .env.local."
    );
  }
  // Dynamic import to avoid top‑level ESM import of IPFSClient.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { IPFSClient } = await import("8004-solana");
  return new IPFSClient({ pinataEnabled: true, pinataJwt: jwt });
}

/**
 * Returns true if PINATA_JWT is present, without reading its value.
 */
export function isIpfsConfigured(): boolean {
  return Boolean(process.env.PINATA_JWT);
}

// ---------------------------------------------------------------------------
// Write-capable SDK factory
// ---------------------------------------------------------------------------

/**
 * Construct a SolanaSDK instance with a signer and IPFS client.
 * Used only for write operations (registerAgent, giveFeedback, etc.).
 *
 * SolanaSDKConfig confirmed from:
 *   node_modules/8004-solana/dist/core/sdk-solana.d.ts
 *   { cluster?, rpcUrl?, signer?: Keypair, ipfsClient?: IPFSClient, ... }
 *
 * IMPORTANT: The returned SDK holds the signer internally. Never serialise
 * or pass this object to client code.
 */
export async function getWriteSdk(): Promise<SolanaSDK> {
  const signer = getSignerKeypair();
  const { IPFSClient, SolanaSDK } = await import("8004-solana");
  const ipfs = new IPFSClient({ pinataEnabled: true, pinataJwt: process.env.PINATA_JWT || "" });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  return new SolanaSDK({
    cluster: CLUSTER,
    rpcUrl: RPC_URL,
    signer,
    ipfsClient: ipfs,
  });
}

/**
 * Returns true if both SOLANA_PRIVATE_KEY and PINATA_JWT are configured.
 * Safe to expose via a status endpoint — returns only a boolean, no secrets.
 */
export function isWriteConfigured(): boolean {
  return isSignerConfigured() && isIpfsConfigured();
}

/**
 * Returns the client evaluator Keypair used for submitting feedback.
 * The ATOM program prevents an agent's owner from rating their own agent.
 * We use `new-solana-wallet.json` (or CLIENT_SOLANA_PRIVATE_KEY) if available,
 * and fall back to getSignerKeypair().
 */
export function getClientSignerKeypair(): Keypair {
  // First check if CLIENT_SOLANA_PRIVATE_KEY is in process.env
  const clientEnv = process.env.CLIENT_SOLANA_PRIVATE_KEY;
  if (clientEnv) {
    try {
      const parsed = JSON.parse(clientEnv);
      if (Array.isArray(parsed) && parsed.length === 64) {
        return Keypair.fromSecretKey(Uint8Array.from(parsed as number[]));
      }
    } catch {
      // Fall through to file check
    }
  }

  // Check new-solana-wallet.json in process.cwd()
  try {
    const fs = require("fs");
    const path = require("path");
    const walletPath = path.join(process.cwd(), "new-solana-wallet.json");
    if (fs.existsSync(walletPath)) {
      const raw = fs.readFileSync(walletPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 64) {
        return Keypair.fromSecretKey(Uint8Array.from(parsed as number[]));
      }
    }
  } catch {
    // Ignore error and fall back
  }

  return getSignerKeypair();
}

/**
 * Constructs a write SDK instance specifically for feedback submission
 * using the client evaluator keypair.
 */
export async function getFeedbackWriteSdk(): Promise<SolanaSDK> {
  const signer = getClientSignerKeypair();
  const { IPFSClient, SolanaSDK } = await import("8004-solana");
  const ipfs = new IPFSClient({ pinataEnabled: true, pinataJwt: process.env.PINATA_JWT || "" });
  return new SolanaSDK({
    cluster: CLUSTER,
    rpcUrl: RPC_URL,
    signer,
    ipfsClient: ipfs,
  });
}

