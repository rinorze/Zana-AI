"use client";

import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

import { cn } from "@/lib/utils";

export function ConfidenceIndicator({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  let label = "low";
  let color = "text-rose-600 bg-rose-50";
  let Icon = ShieldAlert;
  if (value >= 0.8) {
    label = "high";
    color = "text-emerald-700 bg-emerald-50";
    Icon = ShieldCheck;
  } else if (value >= 0.5) {
    label = "medium";
    color = "text-amber-700 bg-amber-50";
    Icon = ShieldQuestion;
  }
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", color, className)}
      title={`Confidence ${label}`}
      aria-label={`Confidence ${label} (${pct}%)`}
    >
      <Icon className="h-3 w-3" />
      {pct}%
    </span>
  );
}
