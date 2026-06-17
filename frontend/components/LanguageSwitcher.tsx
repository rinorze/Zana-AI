"use client";

import { LANGUAGES, type Language } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const SHORT: Record<Language, string> = { sq: "Shq", en: "Eng", sr: "Srb" };

export function LanguageSwitcher() {
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Language switcher">
      {LANGUAGES.map((code, idx) => (
        <span key={code} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLanguage(code)}
            className={cn(
              "text-xs font-bold transition-opacity",
              language === code ? "underline underline-offset-4" : "opacity-70 hover:opacity-100",
            )}
            aria-pressed={language === code}
          >
            {SHORT[code]}
          </button>
          {idx < LANGUAGES.length - 1 && <span className="opacity-40">|</span>}
        </span>
      ))}
    </div>
  );
}
