"use client";

import { ArrowRight } from "lucide-react";

import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Language } from "@/lib/i18n";
import type { StructuredProcedure } from "@/lib/stream";

interface FollowUpsProps {
  /** Last user question — used to avoid suggesting essentially the same thing. */
  lastQuestion: string;
  /** Assistant answer text — we mine it for what's already covered. */
  answer: string;
  /** Structured procedure (if any) — gives us topic hooks (fee, office, docs). */
  structured?: StructuredProcedure;
  onPick: (text: string) => void;
}

interface Suggestion {
  /** Topic the suggestion is about; we skip it if the answer clearly covers it. */
  topic: "fee" | "office" | "docs" | "duration" | "online" | "express" | "loss" | "renew" | "abroad";
  text: string;
}

const POOL: Record<Language, Suggestion[]> = {
  sq: [
    { topic: "fee", text: "Sa kushton në total?" },
    { topic: "office", text: "Ku është zyra më e afërt?" },
    { topic: "docs", text: "Cilat dokumente duhen?" },
    { topic: "duration", text: "Sa kohë zgjat procesi?" },
    { topic: "online", text: "A mund të aplikoj online?" },
    { topic: "express", text: "A ka procedurë të përshpejtuar?" },
    { topic: "loss", text: "Çfarë nëse e humbas?" },
    { topic: "renew", text: "Si rinovohet?" },
    { topic: "abroad", text: "A mund të aplikoj nga jashtë vendit?" },
  ],
  en: [
    { topic: "fee", text: "What is the total cost?" },
    { topic: "office", text: "Where is the nearest office?" },
    { topic: "docs", text: "What documents do I need?" },
    { topic: "duration", text: "How long does it take?" },
    { topic: "online", text: "Can I apply online?" },
    { topic: "express", text: "Is there an express option?" },
    { topic: "loss", text: "What if I lose it?" },
    { topic: "renew", text: "How do I renew it?" },
    { topic: "abroad", text: "Can I apply from abroad?" },
  ],
  sr: [
    { topic: "fee", text: "Kolika je ukupna cena?" },
    { topic: "office", text: "Gde je najbliža kancelarija?" },
    { topic: "docs", text: "Koja dokumenta su potrebna?" },
    { topic: "duration", text: "Koliko traje proces?" },
    { topic: "online", text: "Mogu li da se prijavim onlajn?" },
    { topic: "express", text: "Postoji li hitan postupak?" },
    { topic: "loss", text: "Šta ako ga izgubim?" },
    { topic: "renew", text: "Kako se obnavlja?" },
    { topic: "abroad", text: "Mogu li da se prijavim iz inostranstva?" },
  ],
};

/**
 * Compute follow-ups by removing any topic that's already obviously covered.
 *
 * We don't call the LLM — heuristic keyword scan over the answer keeps the
 * chips appearing the moment the answer finishes streaming.
 */
function pickSuggestions(language: Language, answer: string, lastQuestion: string, structured?: StructuredProcedure): Suggestion[] {
  const ans = (answer + " " + lastQuestion).toLowerCase();
  const covered = new Set<Suggestion["topic"]>();
  if (/(eur|tarif|kushton|cost|fee|cena|naknada|košta)/i.test(ans)) covered.add("fee");
  if (/(zyr|office|adres|kancelar)/i.test(ans)) covered.add("office");
  if (/(dokument|document|dokumenta|kërkohen|potrebn|need)/i.test(ans)) covered.add("docs");
  if (/(ditë|ditëve|days|dana|kohëzgjatje|duration|sa zgjat|how long|koliko traje)/i.test(ans)) covered.add("duration");
  if (/(online|elektronik|ekosova)/i.test(ans)) covered.add("online");
  if (/(urgjent|express|përshpejtuar|hitn)/i.test(ans)) covered.add("express");
  if (/(humb|lost|izgub)/i.test(ans)) covered.add("loss");
  if (/(rinov|renew|obnov)/i.test(ans)) covered.add("renew");
  if (/(jashtë|abroad|inostran)/i.test(ans)) covered.add("abroad");

  // If structured fields are missing, *raise* their priority — the citizen
  // probably still doesn't have that info.
  const missing = new Set<Suggestion["topic"]>();
  if (structured) {
    if (!structured.fee) missing.add("fee");
    if (!structured.office) missing.add("office");
    if (!structured.documents?.length) missing.add("docs");
    if (!structured.duration) missing.add("duration");
  }

  const pool = POOL[language] || POOL.sq;
  const ranked = [...pool].sort((a, b) => {
    const aCov = covered.has(a.topic) ? 1 : 0;
    const bCov = covered.has(b.topic) ? 1 : 0;
    if (aCov !== bCov) return aCov - bCov;
    const aMiss = missing.has(a.topic) ? -1 : 0;
    const bMiss = missing.has(b.topic) ? -1 : 0;
    return aMiss - bMiss;
  });
  return ranked.slice(0, 3);
}

export function FollowUps({ lastQuestion, answer, structured, onPick }: FollowUpsProps) {
  const t = useT();
  const language = useStore((s) => s.language);
  if (!answer.trim()) return null;
  const suggestions = pickSuggestions(language, answer, lastQuestion, structured);
  if (suggestions.length === 0) return null;
  return (
    <div className="space-y-1.5 pt-2 border-t ek-border">
      <p className="text-[10px] uppercase tracking-widest ek-text-muted font-bold">{t("follow_ups")}</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.text}
            type="button"
            onClick={() => onPick(s.text)}
            className="inline-flex items-center gap-1 rounded-full bg-white border ek-border ek-text-secondary text-xs px-3 py-1 hover:bg-brand-light transition-colors"
          >
            {s.text}
            <ArrowRight className="h-3 w-3" />
          </button>
        ))}
      </div>
    </div>
  );
}
