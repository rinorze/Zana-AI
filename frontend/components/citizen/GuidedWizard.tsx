"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, HelpCircle, MessageSquare, X, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { useStore } from "@/lib/store";
import { pickLocalized } from "@/lib/utils";
import type { ServiceDetail } from "@/lib/api";

type Answer = "yes" | "no" | "unsure";

interface WizardState {
  docAnswers: Record<string, Answer>;
  currentIndex: number;
  done: boolean;
}

/**
 * Step-by-step guided procedure helper.
 *
 * Walks the citizen through the service's required documents one at a time.
 * Each document gets a Yes / No / I don't know vote. At the end we show a
 * personalised checklist + a quick "Ask ZANA" jump for any missing item.
 */
export function GuidedWizard({ service, onClose }: { service: ServiceDetail; onClose: () => void }) {
  const language = useStore((s) => s.language);
  const docs = service.required_documents ?? [];
  const total = docs.length;
  const [state, setState] = useState<WizardState>({ docAnswers: {}, currentIndex: 0, done: false });

  const current = docs[state.currentIndex];
  const percent = total > 0 ? Math.round(((state.currentIndex + (state.done ? 1 : 0)) / total) * 100) : 0;

  const serviceName = useMemo(() => pickLocalized(service.names, language) || service.service_id, [service, language]);

  function answer(value: Answer) {
    setState((prev) => {
      const next = { ...prev.docAnswers, [current ?? ""]: value };
      const nextIndex = prev.currentIndex + 1;
      const done = nextIndex >= total;
      return { docAnswers: next, currentIndex: done ? total : nextIndex, done };
    });
  }

  function reset() {
    setState({ docAnswers: {}, currentIndex: 0, done: false });
  }

  const missing = docs.filter((d) => state.docAnswers[d] !== "yes");

  return (
    <section className="ek-glass-card p-5 space-y-4 relative">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close wizard"
        className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white border ek-border inline-flex items-center justify-center"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <header className="space-y-2">
        <h3 className="ek-text-brand font-bold text-lg">Më ndihmo hap pas hapi</h3>
        <p className="text-xs ek-text-muted">{serviceName}</p>
        <div className="h-2 bg-brand-light rounded-full overflow-hidden">
          <div className="h-full bg-brand-secondary transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-[11px] ek-text-muted">{percent}% e plotësuar</p>
      </header>

      {!state.done && current && (
        <div className="space-y-3">
          <p className="text-sm font-bold ek-text-brand">
            {state.currentIndex + 1}/{total} · A e ke këtë dokument?
          </p>
          <p className="text-base bg-brand-light p-3 rounded-md font-medium">{current}</p>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => answer("yes")} className="ek-tile-action">
              <CheckCircle2 className="h-3.5 w-3.5" /> Po
            </button>
            <button type="button" onClick={() => answer("no")} className="ek-tile-action">
              <XCircle className="h-3.5 w-3.5" /> Jo
            </button>
            <button type="button" onClick={() => answer("unsure")} className="ek-tile-action">
              <HelpCircle className="h-3.5 w-3.5" /> Nuk e di
            </button>
          </div>
          <Link
            href={`/chat?q=${encodeURIComponent(`Si ta marr: ${current}?`)}&service=${encodeURIComponent(service.service_id)}`}
            className="text-xs ek-text-secondary hover:underline inline-flex items-center gap-1"
          >
            <MessageSquare className="h-3 w-3" />
            Pyet ZANA-n për këtë dokument
          </Link>
        </div>
      )}

      {state.done && (
        <div className="space-y-3">
          <p className="font-bold ek-text-brand">Përmbledhja jote</p>
          <ul className="space-y-2 text-sm">
            {docs.map((doc) => {
              const a = state.docAnswers[doc];
              return (
                <li key={doc} className="flex items-start gap-2">
                  {a === "yes" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
                  ) : a === "no" ? (
                    <XCircle className="h-4 w-4 text-rose-600 mt-0.5" />
                  ) : (
                    <HelpCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  )}
                  <span className={a === "yes" ? "" : "ek-text-muted"}>{doc}</span>
                </li>
              );
            })}
          </ul>
          {missing.length > 0 ? (
            <div className="rounded-md bg-amber-50 p-3 text-sm space-y-2">
              <p className="font-bold text-amber-900">Ende të mungojnë {missing.length} dokument(e)</p>
              <ul className="list-disc pl-4 text-xs ek-text">
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <Link
                href={`/chat?q=${encodeURIComponent(`Si t'i marr këto dokumente: ${missing.join(", ")}?`)}&service=${encodeURIComponent(service.service_id)}`}
                className="inline-flex items-center gap-1 ek-cta-primary text-xs px-3 py-1.5"
              >
                <MessageSquare className="h-3 w-3" />
                Pyet ZANA si t&apos;i marrësh
              </Link>
            </div>
          ) : (
            <div className="rounded-md bg-emerald-50 p-3 text-sm">
              <p className="font-bold text-emerald-900">✓ Ke gjithçka për të aplikuar!</p>
              <p className="text-xs ek-text mt-1">
                Mund të vazhdosh me hapat e procedurës ose të aplikosh online në eKosova.
              </p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={reset} className="ek-cta-outline text-xs px-3 py-1.5">
              Rifillo
            </button>
            <button type="button" onClick={onClose} className="ek-cta-primary text-xs px-3 py-1.5">
              Mbylle
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
