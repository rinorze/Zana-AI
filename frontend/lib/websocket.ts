
import { apiBase, getToken } from "@/lib/api";

export interface Suggestion {
  text: string;
  confidence: number;
  source?: string;
}

export interface SuggestPayload {
  suggestions: Suggestion[];
  language?: string;
  chunks_used?: number;
  error?: string;
  reason?: string;
  raw?: string;
}

export interface AgentSuggestSocketOptions {
  onMessage: (payload: SuggestPayload) => void;
  onStatus?: (status: "connecting" | "open" | "closed" | "error") => void;
}

/**
 * Agent co-pilot suggestions over HTTP (POST /api/agent/suggest).
 *
 * This used to be a WebSocket. The hosted demo runs on Vercel, whose Python
 * functions cannot hold WebSockets, so it is plain HTTP now. The class keeps
 * its old interface (connect / send / close) so the page did not change. A new
 * input cancels the request still in flight; the page already debounces.
 */
export class AgentSuggestSocket {
  private opts: AgentSuggestSocketOptions;
  private inFlight: AbortController | null = null;
  private closed = false;

  constructor(opts: AgentSuggestSocketOptions) {
    this.opts = opts;
  }

  connect(): void {
    this.closed = false;
    this.opts.onStatus?.(getToken() ? "open" : "error");
  }

  async send(input: string, currentService?: string): Promise<void> {
    if (this.closed) return;
    this.inFlight?.abort();
    const controller = new AbortController();
    this.inFlight = controller;
    this.opts.onStatus?.("connecting");
    try {
      const response = await fetch(`${apiBase}/api/agent/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken() ?? ""}` },
        body: JSON.stringify({ input, current_service: currentService ?? null }),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => ({}))) as SuggestPayload & { detail?: string };
      if (!response.ok) {
        this.opts.onMessage({ suggestions: [], error: payload.detail ?? `HTTP ${response.status}` });
        this.opts.onStatus?.("error");
        return;
      }
      this.opts.onMessage(payload);
      this.opts.onStatus?.("open");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      this.opts.onMessage({ suggestions: [], error: String(err) });
      this.opts.onStatus?.("error");
    }
  }

  close(): void {
    this.closed = true;
    this.inFlight?.abort();
    this.opts.onStatus?.("closed");
  }
}
