"use client";

import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { pickLocalized } from "@/lib/utils";
import type { ServiceStep } from "@/lib/api";

export function StepWalker({ serviceId, steps }: { serviceId: string; steps: ServiceStep[] }) {
  const t = useT();
  const language = useStore((s) => s.language);
  const stepProgress = useStore((s) => s.stepProgress);
  const setStepProgress = useStore((s) => s.setStepProgress);

  const ordered = [...steps].sort((a, b) => a.order - b.order);
  if (ordered.length === 0) return null;
  const currentIndex = Math.min(stepProgress[serviceId] ?? 0, ordered.length - 1);
  const current = ordered[currentIndex];
  const isLast = currentIndex === ordered.length - 1;
  const isFirst = currentIndex === 0;

  return (
    <div className="ek-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold ek-text-brand">
          Hapi {currentIndex + 1} / {ordered.length}
        </h3>
        <span className="text-xs ek-text-muted">{t("progress_saved")}</span>
      </div>
      <div className="flex gap-1">
        {ordered.map((_, idx) => (
          <span
            key={idx}
            className={
              "h-2 flex-1 rounded-full " +
              (idx <= currentIndex ? "bg-brand-secondary" : "bg-brand-light")
            }
          />
        ))}
      </div>
      <div className="space-y-2">
        <p className="font-bold ek-text-brand">{pickLocalized(current.titles, language) || `Step ${current.order}`}</p>
        <p className="text-sm ek-text-muted whitespace-pre-line">
          {pickLocalized(current.descriptions, language)}
        </p>
        {current.required_items?.length > 0 && (
          <ul className="text-sm list-disc pl-5 space-y-1 ek-text">
            {current.required_items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          className="ek-cta-outline text-sm disabled:opacity-50"
          onClick={() => setStepProgress(serviceId, Math.max(0, currentIndex - 1))}
          disabled={isFirst}
          aria-label={t("previous_step")}
        >
          <ChevronLeft className="h-4 w-4" />
          {t("previous_step")}
        </button>
        {isLast ? (
          <span className="ek-cta-primary text-sm" aria-label="Përfunduar">
            <CheckCircle2 className="h-4 w-4" />
            OK
          </span>
        ) : (
          <button
            type="button"
            className="ek-cta-primary text-sm"
            onClick={() => setStepProgress(serviceId, Math.min(ordered.length - 1, currentIndex + 1))}
            aria-label={t("next_step")}
          >
            {t("next_step")}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
