"use client";

import { FileCheck, Loader2 } from "lucide-react";
import { useState } from "react";

import { afterCallSummary } from "@/lib/api";

export function AfterCallSummary({
  service,
  queries,
  suggestions,
}: {
  service: string | null;
  queries: string[];
  suggestions: string[];
}) {
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const result = await afterCallSummary({
        service: service ?? undefined,
        queries,
        suggestions,
        notes,
      });
      setSummary(result.summary);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ek-card p-5 space-y-3">
      <h2 className="ek-page-title text-sm">Përmbledhja e thirrjes</h2>
      <div className="space-y-1">
        <label htmlFor="notes" className="text-xs font-bold ek-text-brand uppercase tracking-wide">Shënime</label>
        <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="ek-input resize-none" />
      </div>
      <button type="button" onClick={generate} disabled={busy} className="ek-cta-primary text-sm w-full">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
        Gjenero
      </button>
      {error && <p className="text-sm text-ek-danger">{error}</p>}
      {summary && (
        <div className="space-y-2">
          <label className="text-xs font-bold ek-text-brand uppercase tracking-wide">Rezultati</label>
          <textarea value={summary} readOnly rows={5} className="ek-input resize-none" />
          <button type="button" className="ek-cta-outline text-xs" onClick={() => navigator.clipboard?.writeText(summary)}>
            Kopjo
          </button>
        </div>
      )}
    </section>
  );
}
