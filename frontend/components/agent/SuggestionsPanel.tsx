"use client";

import { ClipboardCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

import { ConfidenceIndicator } from "@/components/agent/ConfidenceIndicator";
import { logSuggestionHelpful } from "@/lib/api";
import type { SuggestPayload } from "@/lib/websocket";

export function SuggestionsPanel({
  payload,
  query,
  status,
}: {
  payload: SuggestPayload | null;
  query: string;
  status: string;
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [feedbackIndex, setFeedbackIndex] = useState<number | null>(null);

  async function copy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((curr) => (curr === index ? null : curr)), 1500);
    } catch (err) {
      console.error(err);
    }
  }

  async function logFeedback(text: string, index: number, helpful: boolean) {
    try {
      await logSuggestionHelpful({ query, answer: text, suggestion_index: index, helpful });
      setFeedbackIndex(index);
    } catch (err) {
      console.error(err);
    }
  }

  if (!payload) {
    return (
      <div className="ek-card p-6 text-center ek-text-muted text-sm">
        {status === "open" ? "Shkruaj për të marrë sugjerime." : `WebSocket: ${status}`}
      </div>
    );
  }

  if (payload.error) {
    return <div className="ek-card p-4 text-sm text-ek-danger">{payload.error}</div>;
  }

  if ((payload.suggestions ?? []).length === 0) {
    return (
      <div className="ek-card p-4 text-sm ek-text-muted">
        {payload.reason === "empty_input" ? "Shkruaj diçka për të marrë sugjerime." : "Asnjë sugjerim. Verifiko në katalog."}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {payload.suggestions.map((s, idx) => (
        <article key={idx} className="ek-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <ConfidenceIndicator value={s.confidence ?? 0} />
            {s.source && <span className="text-xs ek-text-muted">{s.source}</span>}
          </div>
          <p className="text-sm whitespace-pre-line ek-text">{s.text}</p>
          <div className="flex items-center gap-2">
            <button type="button" className="ek-cta-outline text-xs px-3 py-1" onClick={() => copy(s.text, idx)}>
              <ClipboardCheck className="h-4 w-4" />
              {copiedIndex === idx ? "Kopjuar" : "Kopjo"}
            </button>
            <button
              type="button"
              className="h-8 w-8 rounded-full ek-text-secondary hover:bg-brand-light inline-flex items-center justify-center disabled:opacity-50"
              onClick={() => logFeedback(s.text, idx, true)}
              aria-label="Helpful"
              disabled={feedbackIndex === idx}
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="h-8 w-8 rounded-full ek-text-secondary hover:bg-brand-light inline-flex items-center justify-center disabled:opacity-50"
              onClick={() => logFeedback(s.text, idx, false)}
              aria-label="Not helpful"
              disabled={feedbackIndex === idx}
            >
              <ThumbsDown className="h-4 w-4" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
