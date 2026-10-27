import { NextRequest, NextResponse } from "next/server";
import { getReadOnlySdk } from "@/lib/registry";
import { delegateTask } from "@/lib/agentDelegation";
import { COORDINATOR_AGENT } from "@/lib/agentDefs";
import { promises as fs } from "fs";
import path from "path";
import { PublicKey } from "@solana/web3.js";
import { ServiceType } from "8004-solana";


// Types (mirroring client)
type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  agentId?: string;
  mode: "demo" | "live";
  status: "submitted" | "executing" | "completed" | "failed";
  result?: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const REGISTRY_FILE = path.join(DATA_DIR, "tasks.json");
const FALLBACK_REGISTRY_FILE = path.join(__dirname, "../../../data/tasks.json");

async function loadTasks(): Promise<Task[]> {
  try {
    const raw = await fs.readFile(REGISTRY_FILE, "utf-8");
    return JSON.parse(raw) as Task[];
  } catch {
    try {
      const raw = await fs.readFile(FALLBACK_REGISTRY_FILE, "utf-8");
      return JSON.parse(raw) as Task[];
    } catch {
      return [];
    }
  }
}

async function saveTasks(tasks: Task[]): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(REGISTRY_FILE, JSON.stringify(tasks, null, 2), "utf-8");
  } catch {
    // fallback location (for when cwd is .next)
    const fallbackDir = path.join(__dirname, "../../../data");
    await fs.mkdir(fallbackDir, { recursive: true });
    await fs.writeFile(path.join(fallbackDir, "tasks.json"), JSON.stringify(tasks, null, 2), "utf-8");
  }
}

function deterministicDemo(task: Omit<Task, "id" | "mode" | "status" | "result" | "createdAt">): { result: string; mode: "demo" } {
  const base = `Demo execution for "${task.title}" (${task.category})`;
  const detail = `Processed ${task.description.length} characters.`;
  return { result: `${base}: ${detail}`, mode: "demo" };
}

export const dynamic = "force-dynamic";

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export async function GET(_: NextRequest): Promise<NextResponse> {
  const tasks = await loadTasks();
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  const { title, description, category, mode } = body as { title?: unknown; description?: unknown; category?: unknown; mode?: unknown };
  if (typeof title !== "string" || typeof description !== "string" || typeof category !== "string" || (mode !== "demo" && mode !== "live")) {
    return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }
  const executionMode = mode as "demo" | "live";

  const agentIdValue = (body as { agentId?: unknown }).agentId;
  if (agentIdValue !== undefined && typeof agentIdValue !== "string") {
    return NextResponse.json({ ok: false, error: "Invalid agentId" }, { status: 400 });
  }
  const agentId = agentIdValue;
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();
  let task: Task;
  if (executionMode === "live") {
    if (!agentId) {
      return NextResponse.json({ ok: false, error: "Live mode requires an agentId" }, { status: 400 });
    }
    // Resolve per‑agent endpoint from on‑chain registry
    const agentsFilePrimary = path.join(process.cwd(), "data", "registered-agents.json");
    const agentsFileFallback = path.join(__dirname, "../../../data", "registered-agents.json");
    let agentsRaw: string;
    try {
      agentsRaw = await fs.readFile(agentsFilePrimary, "utf-8");
    } catch {
      agentsRaw = await fs.readFile(agentsFileFallback, "utf-8");
    }
    const agentRecords: { agentId: string; asset: string }[] = JSON.parse(agentsRaw);
    const rec = agentRecords.find((r) => r.agentId === agentId);
    if (!rec) {
      return NextResponse.json({ ok: false, error: "Selected agent not found in registry" }, { status: 400 });
    }
    const sdk = await getReadOnlySdk();
    let perAgentEndpoint: string | null = null;
    try {
      const onChainAgent = await sdk.loadAgent(new PublicKey(rec.asset));
      // Attempt to locate an A2A service definition without using `any`
      const services = (onChainAgent as unknown as { services?: unknown }).services;
      if (Array.isArray(services)) {
        const svc = (services as unknown[]).find((s) => {
          const obj = s as { type?: unknown; value?: unknown };
          return obj.type === ServiceType.A2A && typeof obj.value === "string";
        }) as { value: string } | undefined;
        if (svc) perAgentEndpoint = svc.value;
      }

    } catch {
      // ignore errors – will handle missing endpoint below
    }
    if (!perAgentEndpoint) {
      // If the selected agent is the known coordinator, allow a fallback to the configured coordinator endpoint.
      if (agentId === COORDINATOR_AGENT.id) {
        const envEndpoint = process.env.COORDINATOR_AGENT_ENDPOINT;
        if (typeof envEndpoint === "string" && envEndpoint) {
          perAgentEndpoint = envEndpoint;
        } else {
          return NextResponse.json({ ok: false, error: "Coordinator endpoint not configured" }, { status: 400 });
        }
      } else {
        // For any non‑coordinator agent without a verified A2A endpoint, reject the request.
        return NextResponse.json({ ok: false, error: "Selected agent does not expose a supported A2A endpoint" }, { status: 400 });
      }
    }
    const delegation = await delegateTask({ title, description, category, agentId, endpoint: perAgentEndpoint });
    // Persist task regardless of success
    task = {
      id,
      title,
      description,
      category,
      agentId,
      mode: delegation.mode,
      status: delegation.status,
      result: delegation.result,
      createdAt,
    };
    if (delegation.status === "failed") {
      const existing = await loadTasks();
      existing.unshift(task);
      await saveTasks(existing);
      return NextResponse.json({ ok: false, error: delegation.error ?? "Agent execution failed", task }, { status: 500 });
    }
  } else {
    // Demo mode – ignore any agentId and run deterministic demo
    const demo = deterministicDemo({ title, description, category });
    task = {
      id,
      title,
      description,
      category,
      agentId: undefined,
      mode: demo.mode,
      status: "completed",
      result: demo.result,
      createdAt,
    };
  }

  const existing = await loadTasks();
  existing.unshift(task);
  await saveTasks(existing);

  return NextResponse.json({ ok: true, task });
}
