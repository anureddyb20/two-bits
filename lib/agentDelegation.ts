/**
 * Resolve a live endpoint URL for a given agentId.
 * Uses the read‑only SDK to load the on‑chain agent record and extracts `agent_uri`.
 * Returns the URL string if it looks like a http(s) endpoint, otherwise null.
 */

/**
 * Send the task to a real A2A endpoint.
 * The endpoint is expected to accept a POST with JSON {title, description, category}
 * and respond with {result: string} on success.
 */
// NOTE: Currently, live delegation uses a single globally configured endpoint (COORDINATOR_AGENT_ENDPOINT).
// Per‑agent A2A endpoints are not yet supported; agents are selected based on reputation/capabilities
// but task execution always targets the coordinator. Future versions may resolve each agent's
// `agent_uri` and validate it before delegating.
export async function delegateTask(params: {
  title: string;
  description: string;
  category: string;
  agentId?: string;
  // Optional per‑agent endpoint; if omitted the global COORDINATOR_AGENT_ENDPOINT is used.
  endpoint?: string;
}): Promise<{ mode: "live"; status: "completed" | "failed"; result?: string; error?: string }> {

  const { title, description, category, agentId, endpoint: suppliedEndpoint } = params;
  console.log('NODE_ENV in delegateTask:', process.env.NODE_ENV);
  if (!agentId) {
    return { mode: "live", status: "failed", error: "No agentId supplied" };
  }


  // Resolve endpoint: prefer per‑agent endpoint, otherwise global env var.
  let endpoint: string | null = null;
  if (typeof suppliedEndpoint === "string" && suppliedEndpoint) {
    endpoint = suppliedEndpoint;
  } else {
    const envEndpoint = process.env.COORDINATOR_AGENT_ENDPOINT;
    if (typeof envEndpoint === "string" && envEndpoint) {
      endpoint = envEndpoint;
    }
  }
  // No fallback beyond this – live execution requires an explicit endpoint.

  // Validate endpoint – must be http(s) and pass basic safety checks.
  if (endpoint) {
    if (!/^https?:\/\//i.test(endpoint)) {
      endpoint = null;
    } else {
      try {
        const u = new URL(endpoint);
        // Reject auth info
        if (u.username || u.password) {
          endpoint = null;
        } else {
          // Development mode: allow the exact localhost dev endpoint
          if (process.env.NODE_ENV === "development") {
            const allowed = "http://localhost:3002/api/agents/real";
            if (u.href === allowed && !u.search && !u.hash) {
              // allowed – skip further host checks
            } else {
              // Apply normal host checks
              const h = u.hostname.toLowerCase();
              if (h === "localhost" || h === "127.0.0.1" || h === "::1") endpoint = null;
              if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) endpoint = null;
              if (/^169\.254\./.test(h) || /^224\./.test(h)) endpoint = null;
              if (/^fe80:/i.test(h) || /^ff00:/i.test(h)) endpoint = null;
            }
          } else {
            // Production mode – apply normal host checks
            const h = u.hostname.toLowerCase();
            if (h === "localhost" || h === "127.0.0.1" || h === "::1") endpoint = null;
            if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) endpoint = null;
            if (/^169\.254\./.test(h) || /^224\./.test(h)) endpoint = null;
            if (/^fe80:/i.test(h) || /^ff00:/i.test(h)) endpoint = null;
          }
        }
      } catch {
        endpoint = null;
      }
    }
  }

  if (!endpoint) {
    return { mode: "live", status: "failed", error: "No live agent endpoint configured. Deploy a compatible agent and set COORDINATOR_AGENT_ENDPOINT." };
  }
  // Simple timeout handling
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s
  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, category }),
      signal: controller.signal,
      redirect: "error", // do not follow redirects (prevents SSRF via redirect)
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      // Do not expose raw body, just status
      return { mode: "live", status: "failed", error: `Endpoint returned ${resp.status}` };
    }
    const data = await resp.json();
    if (typeof data.result !== "string") {
      return { mode: "live", status: "failed", error: "Malformed response: missing result string" };
    }
    return { mode: "live", status: "completed", result: data.result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { mode: "live", status: "failed", error: `Network or timeout error: ${msg}` };
  } finally {
    clearTimeout(timeout);
  }
}
