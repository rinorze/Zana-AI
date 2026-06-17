"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

import { submitFeedback } from "@/lib/api";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ReactionButtons({
  query,
  answer,
  serviceId,
}: {
  query: string;
  answer: string;
  serviceId?: string;
}) {
  const language = useStore((s) => s.language);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(helpful: boolean) {
    if (busy || vote) return;
    setBusy(true);
    setVote(helpful ? "up" : "down");
    try {
      await submitFeedback({ query, answer, helpful, language, service_id: serviceId });
    } catch {
      // best-effort; the vote stays optimistically registered
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label="Vlerëso përgjigjen">
      <button
        type="button"
        aria-label="E dobishme"
        disabled={vote !== null}
        onClick={() => send(true)}
        className={cn(
          "h-7 w-7 rounded-full inline-flex items-center justify-center transition-colors",
          vote === "up"
            ? "bg-emerald-100 text-emerald-700"
            : "ek-text-muted hover:bg-brand-light hover:text-brand-secondary",
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Jo e dobishme"
        disabled={vote !== null}
        onClick={() => send(false)}
        className={cn(
          "h-7 w-7 rounded-full inline-flex items-center justify-center transition-colors",
          vote === "down"
            ? "bg-rose-100 text-rose-700"
            : "ek-text-muted hover:bg-brand-light hover:text-brand-secondary",
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
