/**
 * lib/agentDefs.ts
 *
 * Static definitions for demo agents registered in Phase 2.
 * Contains NO secrets, NO private keys, NO wallet addresses.
 *
 * These definitions are the source-of-truth for what gets registered on-chain.
 * The actual on-chain identity (asset pubkey) is stored in data/registered-agents.json
 * after a successful registration and is NOT tracked by Git.
 *
 * Metadata format follows the RegistrationFile interface from:
 *   node_modules/8004-solana/dist/models/interfaces.d.ts
 *
 * ServiceType enum values confirmed from:
 *   node_modules/8004-solana/dist/models/enums.d.ts
 *
 * OASF skill/domain strings follow the taxonomy documented at:
 *   node_modules/8004-solana/docs/OASF.md  (if present) or 8004.qnt.sh
 */
import "server-only";

import { ServiceType } from "8004-solana";
import type { RegistrationFile } from "8004-solana";

/**
 * A single agent definition used for registration and UI display.
 * `id` is a stable local identifier — it is never sent on-chain.
 */
export interface AgentDefinition {
  /** Stable local key — used to look up registrations in data/registered-agents.json */
  id: string;
  /** Passed directly to buildRegistrationFileJson() as the RegistrationFile */
  registrationFile: RegistrationFile;
}

/**
 * The one agent registered in Phase 2B.
 * Additional agents (Summarizer, Code Reviewer, Data Analyzer) will be
 * added in Phase 2C once this registration is verified on-chain.
 *
 * NOTE: services[].value must be a real URL or a valid service identifier.
 * For Phase 2 demo agents that have no live endpoints, we use the project's
 * GitHub URL as a placeholder and mark active: false.
 * This is honest — the agent is registered but not yet serving requests.
 */
export const COORDINATOR_AGENT: AgentDefinition = {
  id: "coordinator",
  registrationFile: {
    // Required fields (RegistrationFile interface)
    name: "AHN Coordinator",
    description:
      "Coordinates task discovery, specialist selection, and delegated work in the " +
      "Autonomous Agent Hiring & Delegation Network. Registered on Solana Devnet for " +
      "the Solana Agent Registry hackathon demo.",

    // services: required array — at least one entry.
    // ServiceType.A2A = "A2A" (confirmed from enums.d.ts)
    // Using the project GitHub URL as a placeholder; no live A2A server exists yet.
    services: [
      {
        type: ServiceType.A2A,
        value: "https://github.com/HackToBerFest-VVCE/t2c1-two-bits",
      },
    ],

    // No OASF skills are required for this demo agent.

    // Optional OASF domains
    domains: [
      "technology/software_engineering/software_engineering",
    ],

    // Mark as not-yet-live — honest for a demo agent with no real endpoint
    active: false,

    // No image for Phase 2 — can be added in Phase 5 with a real IPFS CID
    // No walletAddress — set separately via sdk.setAgentWallet() in Phase 3
  },
};

// ---------------------------------------------------------------------------
// Mock specialist agents — displayed in the UI with a clear "Mock" label.
// These are NOT registered on-chain. They exist to demonstrate the
// hiring-and-delegation flow (Phase 3) before real agents are deployed.
// Each has a stable id, display metadata, capabilities, and a mock
// reputation score that is clearly labeled as simulated data.
// ---------------------------------------------------------------------------

export interface MockAgentDisplay {
  id: string;
  name: string;
  emoji: string;
  gradient: string;        // CSS gradient for the avatar
  description: string;
  capabilities: string[];
  skill: string;
  domain: string;
  mockScore: number;        // 0-100 — clearly labeled as demo data in the UI
  mockFeedbacks: number;
  trustTier: "Bronze" | "Silver" | "Gold" | "Platinum";
}

export const MOCK_AGENTS: MockAgentDisplay[] = [
  {
    id: "mock-summarizer",
    name: "Text Summarizer",
    emoji: "📝",
    gradient: "linear-gradient(135deg, #0ea5e9, #6366f1)",
    description:
      "Condenses long documents, research papers, and articles into clear, " +
      "structured summaries. Specialises in extracting key findings and action items.",
    capabilities: ["text summarization", "key extraction", "report generation", "NLP"],
    skill: "natural_language_processing/text_generation/text_generation",
    domain: "technology/software_engineering/software_engineering",
    mockScore: 91,
    mockFeedbacks: 47,
    trustTier: "Gold",
  },
  {
    id: "mock-code-reviewer",
    name: "Code Reviewer",
    emoji: "🔍",
    gradient: "linear-gradient(135deg, #10b981, #3b82f6)",
    description:
      "Reviews code for correctness, security vulnerabilities, and best-practice " +
      "violations. Supports TypeScript, Rust, Python, and Solana programs.",
    capabilities: ["code review", "security analysis", "refactoring", "Solana programs"],
    skill: "natural_language_processing/text_generation/text_generation",
    domain: "technology/software_engineering/software_engineering",
    mockScore: 88,
    mockFeedbacks: 34,
    trustTier: "Silver",
  },
  {
    id: "mock-data-analyzer",
    name: "Data Analyzer",
    emoji: "📊",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    description:
      "Processes structured and unstructured datasets, identifies patterns and " +
      "anomalies, and produces actionable insights with supporting charts.",
    capabilities: ["data analysis", "anomaly detection", "pattern recognition", "reporting"],
    skill: "natural_language_processing/text_generation/text_generation",
    domain: "technology/software_engineering/software_engineering",
    mockScore: 85,
    mockFeedbacks: 29,
    trustTier: "Silver",
  },
];

/** All agents that should exist after a full Phase 2 seed. Phase 2B registers only COORDINATOR_AGENT. */
export const ALL_AGENT_DEFS: AgentDefinition[] = [COORDINATOR_AGENT];
