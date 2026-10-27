import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * Real AI agent endpoint – compatible with lib/agentDelegation contract.
 * Accepts POST JSON { title, description, category }.
 * Returns { result: string } on success.
 */
export const dynamic = "force-dynamic";

// Configuration – read API key only on server side.
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = "openai/gpt-oss-20b"; // Groq production text‑generation model
const TIMEOUT_MS = 8000; // 8 seconds default
const MAX_REQUEST_SIZE = 10 * 1024; // 10 KB
const MAX_RESULT_LENGTH = 2000; // characters

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Enforce content‑type
  if (request.headers.get("content-type")?.includes("application/json") !== true) {
    return NextResponse.json({ error: "Invalid content type" }, { status: 415 });
  }

  // Stream‑read the body with a size limit (works even without Content‑Length)
  const reader = request.body?.getReader?.();
  if (!reader) {
    return NextResponse.json({ error: "Unable to read request body" }, { status: 400 });
  }
  let received = 0;
  let raw = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = value ?? new Uint8Array();
    received += chunk.length;
    if (received > MAX_REQUEST_SIZE) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    raw += new TextDecoder().decode(chunk);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  let { title, description, category } = payload as {
    title?: unknown;
    description?: unknown;
    category?: unknown;
  };

  // Trim whitespace and validate non‑empty fields
    const t = title?.toString().trim() ?? "";
    const d = description?.toString().trim() ?? "";
    const c = category?.toString().trim() ?? "";
    if (!t || !d || !c) {
      return NextResponse.json({ error: "Fields cannot be empty" }, { status: 400 });
    }
    // Validate category against known list (matches UI options)
    const allowedCategories = ["research", "coding", "analysis", "general"];
    if (!allowedCategories.includes(c)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    // Enforce length limits after trimming
    if (t.length > 200) {
      return NextResponse.json({ error: "Title too long" }, { status: 400 });
    }
    if (d.length > 5000) {
      return NextResponse.json({ error: "Description too long" }, { status: 400 });
    }
    // Re‑assign sanitized values for later use
    title = t;
    description = d;
    category = c;

  if (!GROQ_API_KEY) {
    console.error("GROQ_API_KEY missing");
    return NextResponse.json({ error: "Agent configuration missing" }, { status: 500 });
  }

  const client = new OpenAI({ apiKey: GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
  const prompt = `You are an autonomous assistant. Perform the following request:\n\nTitle: ${title}\nDescription: ${description}\nCategory: ${category}\n\nProvide a concise answer.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let rawResult = "";
  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    }, { signal: controller.signal });
    rawResult = completion.choices?.[0]?.message?.content ?? "";
  } catch (e: unknown) {
    console.error("Agent error:", e);
    return NextResponse.json({ error: "Agent processing failed" }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
  const sanitized = rawResult.trim().slice(0, MAX_RESULT_LENGTH);
  if (!sanitized) {
    return NextResponse.json({ error: "Agent returned empty result" }, { status: 500 });
  }
  return NextResponse.json({ result: sanitized }, { status: 200 });
}
