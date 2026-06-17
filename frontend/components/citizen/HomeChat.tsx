"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, ExternalLink, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Markdown } from "@/components/Markdown";
import { FollowUps } from "@/components/citizen/FollowUps";
import { QuickActions } from "@/components/citizen/QuickActions";
import { ReactionButtons } from "@/components/citizen/ReactionButtons";
import { ReadAloudButton } from "@/components/citizen/ReadAloudButton";
import { VoiceInput } from "@/components/citizen/VoiceInput";
import { VoiceModeToggle } from "@/components/citizen/VoiceModeToggle";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import {
  type Citation,
  type StructuredProcedure,
  streamChat,
} from "@/lib/stream";

interface Clarification {
  prompt: string;
  candidates: Array<{ service_id: string; name: string; category: string }>;
}

interface ChatState {
  question: string;
  answer: string;
  language?: string;
  citations: Citation[];
  structured?: StructuredProcedure;
  busy: boolean;
  finished: boolean;
  grounded?: boolean;
  confidence?: number;
  method?: string;
  activeServiceId?: string | null;
  activeServiceName?: string | null;
  clarification?: Clarification;
}

const EMPTY: ChatState = {
  question: "",
  answer: "",
  citations: [],
  busy: false,
  finished: false,
};

const PRESETS_BY_LANG: Record<string, string[]> = {
  sq: [
    "Sa kushton pasaporta?",
    "Çfarë dokumentesh nevojiten për letërnjoftim?",
    "Si regjistrohem si biznes?",
  ],
  en: [
    "How much does the passport cost?",
    "What documents do I need for an ID card?",
    "How do I register a business?",
  ],
  sr: [
    "Koliko košta pasoš?",
    "Koja dokumenta su potrebna za ličnu kartu?",
    "Kako da registrujem biznis?",
  ],
};

export function HomeChat() {
  const t = useT();
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);
  const simpleMode = useStore((s) => s.simpleMode);
  const [input, setInput] = useState("");
  const [state, setState] = useState<ChatState>(EMPTY);
  const [voiceMode, setVoiceMode] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const answerRef = useRef<HTMLDivElement | null>(null);
  const spokenForRef = useRef<string>("");

  // Hands-free loop: when voiceMode is on and an answer just finished
  // streaming, read it aloud automatically. Stops if voiceMode is turned off
  // mid-utterance.
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!voiceMode || !state.finished || !state.answer) return;
    if (spokenForRef.current === state.question) return;
    spokenForRef.current = state.question;
    const utter = new SpeechSynthesisUtterance(state.answer);
    const lang = state.language ?? language;
    utter.lang = lang === "en" ? "en-US" : lang === "sr" ? "sr-RS" : "sq-AL";
    utter.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [
    voiceMode,
    state.finished,
    state.answer,
    state.question,
    state.language,
    language,
  ]);

  useEffect(() => {
    if (!voiceMode && typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
  }, [voiceMode]);

  const ask = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || state.busy) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setInput("");
      // Preserve activeServiceId across turns so the next request can hint it.
      const carryActive = state.activeServiceId ?? undefined;
      const carryActiveName = state.activeServiceName ?? undefined;
      setState({
        question: q,
        answer: "",
        citations: [],
        busy: true,
        finished: false,
        activeServiceId: carryActive,
        activeServiceName: carryActiveName,
      });

      try {
        for await (const event of streamChat(
          {
            message: q,
            language,
            simple_mode: simpleMode,
            active_service_id: carryActive,
          },
          controller.signal,
        )) {
          setState((prev) => {
            switch (event.type) {
              case "language":
                return { ...prev, language: event.language };
              case "retrieval":
                return {
                  ...prev,
                  grounded: event.grounded,
                  confidence: event.confidence,
                  method: event.method,
                  activeServiceId:
                    event.activeServiceId ?? prev.activeServiceId,
                  activeServiceName:
                    event.activeServiceName ?? prev.activeServiceName,
                };
              case "clarification":
                return {
                  ...prev,
                  clarification: {
                    prompt: event.prompt,
                    candidates: event.candidates,
                  },
                };
              case "citations":
              case "citations_final":
                return { ...prev, citations: event.citations };
              case "token":
                return { ...prev, answer: prev.answer + event.content };
              case "structured":
                return { ...prev, structured: event.structured };
              case "error":
                return {
                  ...prev,
                  answer: prev.answer + `\n⚠️ ${event.message}`,
                };
              default:
                return prev;
            }
          });
        }
      } catch (err) {
        setState((prev) => ({
          ...prev,
          answer: prev.answer + `\n⚠️ ${String(err)}`,
        }));
      } finally {
        setState((prev) => ({ ...prev, busy: false, finished: true }));
      }
    },
    [
      language,
      simpleMode,
      state.activeServiceId,
      state.activeServiceName,
      state.busy,
    ],
  );

  useEffect(() => {
    if (state.busy && answerRef.current) {
      answerRef.current.scrollTo({
        top: answerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [state.answer, state.busy]);

  const presets = PRESETS_BY_LANG[language] ?? PRESETS_BY_LANG.sq;

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition"
      >
        <Sparkles
          className="h-5 w-5 ml-3 text-blue-600 shrink-0"
          aria-hidden="true"
        />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("hero_search_placeholder")}
          aria-label={t("hero_search_placeholder")}
          className="flex-1 bg-transparent py-3 outline-none text-sm md:text-base"
        />
        <VoiceModeToggle enabled={voiceMode} onToggle={setVoiceMode} />
        <VoiceInput
          language={language}
          onTranscript={setInput}
          ariaLabel={t("voice_input")}
        />
        <button
          type="submit"
          disabled={state.busy || !input.trim()}
          className="ek-cta-primary py-2 px-4 text-sm rounded-full disabled:opacity-50"
        >
          {t("ask_zana")}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => ask(p)}
            className="ek-tag hover:bg-brand-soft transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {(state.busy || state.finished || state.question) && (
        <article className="bg-white border border-gray-200 rounded-2xl shadow-sm ek-fade-up p-5 space-y-3 text-left">
          <header className="flex items-center justify-between gap-2 text-sm">
            <div className="inline-flex items-center gap-2 text-gray-500">
              <span className="inline-flex h-7 w-7 rounded-full bg-blue-50 items-center justify-center text-blue-600">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="font-bold text-black">ZANA</span>
              {state.language && state.language === language && (
                <span className="ek-tag uppercase text-[10px]">
                  {state.language}
                </span>
              )}
              {state.language && state.language !== language && (
                <button
                  type="button"
                  onClick={() => setLanguage(state.language as typeof language)}
                  title={`Auto-detected ${state.language.toUpperCase()} — click to switch UI`}
                  className="inline-flex items-center gap-1 rounded-full bg-yellow-50 text-yellow-900 px-2 py-0.5 text-[10px] font-bold border border-yellow-200 hover:bg-yellow-100"
                >
                  🌐 Auto: {state.language.toUpperCase()} → kalo në{" "}
                  {state.language.toUpperCase()}
                </button>
              )}
              {state.grounded === true && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-bold">
                  ✓ {Math.round((state.confidence ?? 0) * 100)}% i bazuar
                </span>
              )}
              {state.grounded === false && (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 text-yellow-800 px-2 py-0.5 text-[10px] font-bold">
                  ⚠ Verifiko në eKosova
                </span>
              )}
              {state.activeServiceName && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-bold">
                  📂 {state.activeServiceName}
                </span>
              )}
            </div>
            <div className="inline-flex items-center gap-1">
              {!state.busy && state.answer && (
                <ReactionButtons
                  query={state.question}
                  answer={state.answer}
                  serviceId={state.structured?.service_id}
                />
              )}
              {!state.busy && state.answer && (
                <ReadAloudButton
                  text={state.answer}
                  language={state.language ?? language}
                />
              )}
            </div>
          </header>

          <p className="text-sm text-gray-500 italic">
            &ldquo;{state.question}&rdquo;
          </p>

          {state.clarification && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs space-y-2">
              <p className="font-bold text-yellow-900">
                🤔 {state.clarification.prompt}
              </p>
              <div className="flex flex-wrap gap-2">
                {state.clarification.candidates.map((c) => (
                  <button
                    key={c.service_id}
                    type="button"
                    onClick={() => ask(`${state.question} (${c.name})`)}
                    className="inline-flex items-center gap-1 rounded-full bg-white border border-yellow-300 text-yellow-900 px-3 py-1 text-xs font-bold hover:bg-yellow-100"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={answerRef} className="max-h-[340px] overflow-y-auto pr-1">
            {state.answer ? (
              <Markdown text={state.answer} citations={state.citations} />
            ) : (
              <span className="inline-flex items-center gap-1 text-gray-400">
                <span className="ek-typing-dot" />
                <span className="ek-typing-dot" />
                <span className="ek-typing-dot" />
              </span>
            )}
          </div>

          {state.structured && (
            <div className="space-y-2">
              <div className="rounded-lg bg-blue-50 p-3 text-xs space-y-1">
                <p className="font-bold text-blue-700">
                  {state.structured.name}
                </p>
                {state.structured.fee && <p>💶 {state.structured.fee}</p>}
                {state.structured.duration && (
                  <p>⏱️ {state.structured.duration}</p>
                )}
                {state.structured.office && <p>🏢 {state.structured.office}</p>}
              </div>
              <QuickActions structured={state.structured} />
            </div>
          )}

          {state.citations.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-200">
              <span className="text-xs text-gray-500">{t("citations")}:</span>
              {state.citations.slice(0, 5).map((c) => (
                <a
                  key={c.marker}
                  href={c.source_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="ek-tag inline-flex items-center gap-1 text-[11px] hover:underline"
                  title={c.snippet}
                >
                  [{c.marker}] {c.service_id || "burim"}
                  {c.source_url && <ExternalLink className="h-3 w-3" />}
                </a>
              ))}
            </div>
          )}

          {state.finished && state.answer && (
            <FollowUps
              lastQuestion={state.question}
              answer={state.answer}
              structured={state.structured}
              onPick={ask}
            />
          )}

          {state.finished && state.answer && (
            <div className="pt-2 flex flex-wrap gap-2">
              <Link
                href={`/chat?q=${encodeURIComponent(state.question)}`}
                className="ek-cta-outline text-xs px-4 py-1.5"
              >
                <Send className="h-3 w-3" />
                {t("open_in_chat")}
              </Link>
              {state.structured?.service_id && (
                <Link
                  href={`/services/${state.structured.service_id}`}
                  className="ek-cta-primary text-xs px-4 py-1.5"
                >
                  {t("view_service")}
                </Link>
              )}
            </div>
          )}
        </article>
      )}
    </div>
  );
}
