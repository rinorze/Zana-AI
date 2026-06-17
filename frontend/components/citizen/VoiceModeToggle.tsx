"use client";

import { Headphones } from "lucide-react";

import { cn } from "@/lib/utils";

export function VoiceModeToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      aria-pressed={enabled}
      aria-label="Voice-only mode"
      title={enabled ? "Voice mode është aktiv" : "Aktivizo voice mode"}
      className={cn(
        "inline-flex items-center justify-center h-10 w-10 rounded-full border transition-colors",
        enabled
          ? "bg-emerald-500 border-emerald-500 text-white ek-recording-pulse"
          : "bg-white border-brand-secondary text-brand-secondary hover:bg-brand-light",
      )}
    >
      <Headphones className="h-4 w-4" />
    </button>
  );
}
