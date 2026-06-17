/**
 * Wrapper around the agent co-pilot WebSocket.
 *
 * Handles auto-reconnect with exponential backoff and exposes a typed callback
 * surface so the UI doesn't have to deal with raw frames.
 */

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

function toWsUrl(httpBase: string): string {
  return httpBase.replace(/^http/, "ws");
}

export class AgentSuggestSocket {
  private socket: WebSocket | null = null;
  private opts: AgentSuggestSocketOptions;
  private attempts = 0;
  private closedByUser = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: AgentSuggestSocketOptions) {
    this.opts = opts;
  }

  connect(): void {
    const token = getToken();
    if (!token) {
      this.opts.onStatus?.("error");
      return;
    }
    const url = `${toWsUrl(apiBase)}/ws/agent/suggest?token=${encodeURIComponent(token)}`;
    this.opts.onStatus?.("connecting");
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.attempts = 0;
      this.opts.onStatus?.("open");
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SuggestPayload;
        this.opts.onMessage(payload);
      } catch {
        // ignore malformed frames; backend always sends JSON
      }
    };

    this.socket.onerror = () => {
      this.opts.onStatus?.("error");
    };

    this.socket.onclose = () => {
      this.socket = null;
      this.opts.onStatus?.("closed");
      if (this.closedByUser) return;
      this.attempts += 1;
      const delay = Math.min(1000 * 2 ** Math.min(this.attempts, 5), 15000);
      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    };
  }

  send(input: string, currentService?: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ input, current_service: currentService ?? null }));
  }

  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
  }
}
