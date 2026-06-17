"use client";

import { Square, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const VOICE_LOCALES: Record<string, string> = { sq: "sq-AL", en: "en-US", sr: "sr-RS" };

export function ReadAloudButton({ text, language = "sq" }: { text: string; language?: string }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  function speak() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      alert("Text-to-speech not available in this browser.");
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = VOICE_LOCALES[language] ?? "sq-AL";
    utter.rate = 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  }

  function stop() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  if (!text) return null;

  return speaking ? (
    <Button variant="outline" size="icon" onClick={stop} aria-label="Stop reading">
      <Square className="h-4 w-4" />
    </Button>
  ) : (
    <Button variant="ghost" size="icon" onClick={speak} aria-label="Read aloud">
      <Volume2 className="h-4 w-4" />
    </Button>
  );
}
