/**
 * SSE parser for the citizen /api/chat endpoint.
 *
 * Backend emits event/data pairs separated by blank lines:
 *   event: token
 *   data: {"content":"..."}
 *
 * Returns an async iterable so callers can `for await` over typed events.
 */

import { apiBase, getToken } from "@/lib/api";

export type ChatEvent =
  | { type: "language"; language: string }
  | { type: "warning"; message: string; detail?: string }
  | { type: "retrieval"; grounded: boolean; confidence: number; method: string; chunks: number; activeServiceId?: string | null; activeServiceName?: string | null }
  | { type: "clarification"; prompt: string; candidates: Array<{ service_id: string; name: string; category: string }> }
  | { type: "citations"; citations: Citation[] }
  | { type: "citations_final"; citations: Citation[] }
  | { type: "token"; content: string }
  | { type: "structured"; structured: StructuredProcedure }
  | { type: "done"; grounded?: boolean }
  | { type: "error"; message: string };

export interface Citation {
  marker: number;
  service_id: string;
  language: string;
  source_url: string;
  snippet: string;
}

export interface StructuredProcedure {
  service_id: string;
  name: string;
  documents: string[];
  fee: string;
  duration: string;
  office: string;
  source_urls: string[];
}

export interface ChatRequest {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  language?: string;
  simple_mode?: boolean;
  service_id?: string;
  active_service_id?: string;
}

function parseEvent(eventName: string, dataLine: string): ChatEvent | null {
  let payload: unknown = {};
  if (dataLine) {
    try {
      payload = JSON.parse(dataLine);
    } catch {
      payload = { raw: dataLine };
    }
  }
  const data = payload as Record<string, unknown>;
  switch (eventName) {
    case "language":
      return { type: "language", language: String(data.language ?? "sq") };
    case "warning":
      return { type: "warning", message: String(data.message ?? "warning"), detail: String(data.detail ?? "") };
    case "retrieval":
      return {
        type: "retrieval",
        grounded: Boolean(data.grounded),
        confidence: Number(data.confidence ?? 0),
        method: String(data.method ?? "semantic"),
        chunks: Number(data.chunks ?? 0),
        activeServiceId: (data.active_service_id as string | null) ?? null,
        activeServiceName: (data.active_service_name as string | null) ?? null,
      };
    case "clarification":
      return {
        type: "clarification",
        prompt: String(data.prompt ?? ""),
        candidates: (data.candidates as Array<{ service_id: string; name: string; category: string }>) ?? [],
      };
    case "citations":
      return { type: "citations", citations: (data.citations as Citation[]) ?? [] };
    case "citations_final":
      return { type: "citations_final", citations: (data.citations as Citation[]) ?? [] };
    case "token":
      return { type: "token", content: String(data.content ?? "") };
    case "structured":
      return { type: "structured", structured: data as unknown as StructuredProcedure };
    case "done":
      return { type: "done", grounded: data.grounded === undefined ? undefined : Boolean(data.grounded) };
    case "error":
      return { type: "error", message: String(data.message ?? "unknown error") };
    default:
      return null;
  }
}

export async function* streamChat(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<ChatEvent> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "text/event-stream" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${apiBase}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok || !response.body) {
    yield { type: "error", message: `HTTP ${response.status}` };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      const block = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      let eventName = "message";
      const dataLines: string[] = [];
      for (const rawLine of block.split("\n")) {
        if (rawLine.startsWith("event: ")) eventName = rawLine.slice(7).trim();
        else if (rawLine.startsWith("data: ")) dataLines.push(rawLine.slice(6));
      }
      const evt = parseEvent(eventName, dataLines.join("\n"));
      if (evt) yield evt;
      separator = buffer.indexOf("\n\n");
    }
  }
}
