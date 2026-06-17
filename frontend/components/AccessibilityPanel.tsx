"use client";

import { Accessibility, Contrast, Languages, Minus, Plus, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useT, LANGUAGES, LANGUAGE_LABELS, type Language } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export function AccessibilityPanel() {
  const t = useT();
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);
  const simpleMode = useStore((s) => s.simpleMode);
  const setSimpleMode = useStore((s) => s.setSimpleMode);
  const highContrast = useStore((s) => s.highContrast);
  const setHighContrast = useStore((s) => s.setHighContrast);
  const fontScale = useStore((s) => s.fontScale);
  const setFontScale = useStore((s) => s.setFontScale);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Open accessibility settings"
          className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-brand-light text-brand-primary hover:bg-brand-soft transition-colors"
        >
          <Accessibility className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("accessibility_settings")}</DialogTitle>
          <DialogDescription>{t("accessibility_description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            <Label className="flex-1">Gjuha / Language</Label>
            <select
              aria-label="Language"
              className="rounded-md border border-border bg-background px-2 py-1"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              {LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {LANGUAGE_LABELS[code]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Contrast className="h-4 w-4" />
            <Label className="flex-1">{t("high_contrast")}</Label>
            <input
              type="checkbox"
              aria-label={t("high_contrast")}
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
              className="h-5 w-5"
            />
          </div>

          <div className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            <Label className="flex-1">{t("font_size")}</Label>
            <Button variant="outline" size="icon" onClick={() => setFontScale(Math.max(0.85, fontScale - 0.1))} aria-label="Decrease font size">
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center text-sm tabular-nums">{Math.round(fontScale * 100)}%</span>
            <Button variant="outline" size="icon" onClick={() => setFontScale(Math.min(1.5, fontScale + 0.1))} aria-label="Increase font size">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label className="flex-1">{t("simple_mode")}</Label>
            <input
              type="checkbox"
              aria-label={t("simple_mode")}
              checked={simpleMode}
              onChange={(e) => setSimpleMode(e.target.checked)}
              className="h-5 w-5"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
