/**
 * Persisted global state — language, accessibility prefs, citizen step-walker
 * progress, and the bearer token mirror (api.ts owns the real cache).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Language } from "@/lib/i18n";

interface ZanaState {
  language: Language;
  simpleMode: boolean;
  highContrast: boolean;
  fontScale: number;
  stepProgress: Record<string, number>;
  setLanguage: (lang: Language) => void;
  setSimpleMode: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setFontScale: (scale: number) => void;
  setStepProgress: (serviceId: string, step: number) => void;
}

export const useStore = create<ZanaState>()(
  persist(
    (set) => ({
      language: "sq",
      simpleMode: false,
      highContrast: false,
      fontScale: 1,
      stepProgress: {},
      setLanguage: (language) => set({ language }),
      setSimpleMode: (simpleMode) => set({ simpleMode }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setFontScale: (fontScale) => set({ fontScale }),
      setStepProgress: (serviceId, step) =>
        set((s) => ({ stepProgress: { ...s.stepProgress, [serviceId]: step } })),
    }),
    { name: "zana.store.v1" },
  ),
);
