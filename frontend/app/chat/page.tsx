"use client";

import { useSearchParams } from "next/navigation";
import { Send, Sparkles, Trash2 } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Markdown } from "@/components/Markdown";
import { PageHero } from "@/components/PageHero";
import { CitationCard } from "@/components/citizen/CitationCard";
import { FollowUps } from "@/components/citizen/FollowUps";
import { QuickActions } from "@/components/citizen/QuickActions";
import { ReactionButtons } from "@/components/citizen/ReactionButtons";
import { ReadAloudButton } from "@/components/citizen/ReadAloudButton";
import { VoiceInput } from "@/components/citizen/VoiceInput";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { type Citation, type ChatEvent, type StructuredProcedure, streamChat } from "@/lib/stream";

interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  structured?: StructuredProcedure;
  language?: string;
  /** For assistant turns: the user question that prompted it. */
  userQuery?: string;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="container py-8 ek-text-muted">Loading…</div>}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const t = useT();
  const language = useStore((s) => s.language);
  const simpleMode = useStore((s) => s.simpleMode);
  const search = useSearchParams();
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const serviceId = search?.get("service") ?? undefined;
  const initialQ = search?.get("q") ?? "";

  const applyEvent = useCallback((assistantId: string, event: ChatEvent) => {
    setTurns((current) =>
      current.map((turn) => {
        if (turn.id !== assistantId) return turn;
        switch (event.type) {
          case "language":
            return { ...turn, language: event.language };
          case "citations":
            return { ...turn, citations: event.citations };
          case "token":
            return { ...turn, content: turn.content + event.content };
          case "structured":
            return { ...turn, structured: event.structured };
          case "error":
            return { ...turn, content: turn.content + `\n⚠️ ${event.message}` };
          default:
            return turn;
        }
      }),
    );
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      const userTurn: ChatTurn = { id: `u-${Date.now()}`, role: "user", content: trimmed };
      const assistantId = `a-${Date.now()}`;
      const assistantTurn: ChatTurn = { id: assistantId, role: "assistant", content: "", citations: [], userQuery: trimmed };

      setTurns((t) => [...t, userTurn, assistantTurn]);
      setInput("");
      setStreaming(true);

      const history = turns.map(({ role, content }) => ({ role, content }));
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        for await (const event of streamChat(
          { message: trimmed, history, language, simple_mode: simpleMode, service_id: serviceId },
          controller.signal,
        )) {
          applyEvent(assistantId, event);
        }
      } catch (err) {
        applyEvent(assistantId, { type: "error", message: String(err) });
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [applyEvent, language, serviceId, simpleMode, streaming, turns],
  );

  useEffect(() => {
    if (initialQ && turns.length === 0) sendMessage(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const allCitations = useMemo(() => turns.flatMap((turn) => turn.citations ?? []).slice(-8), [turns]);

  return (
    <div>
      <PageHero
        eyebrow={`ZANA · ${t("ask_zana")}`}
        title={t("chat_header_title")}
        subtitle={t("chat_header_subtitle")}
        actions={
          turns.length > 0 ? (
            <button type="button" className="ek-cta-outline text-sm" onClick={() => setTurns([])}>
              <Trash2 className="h-4 w-4" />
              {t("chat_clear")}
            </button>
          ) : undefined
        }
      />

      <div className="container py-8 grid gap-4 md:grid-cols-[1fr_340px]">
        <section className="ek-glass-card overflow-hidden flex flex-col h-[72vh]">
          <div ref={scrollerRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
            {turns.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <span className="inline-flex h-16 w-16 rounded-full bg-blue-50 items-center justify-center text-blue-600">
                  <Sparkles className="h-8 w-8" />
                </span>
                <p className="text-xl font-bold mt-4 text-black">{t("chat_empty_title")}</p>
                <p className="text-sm text-gray-500 mt-2">{t("chat_empty_desc")}</p>
              </div>
            )}
            {turns.map((turn) => (
              <ChatBubble key={turn.id} turn={turn} simpleMode={simpleMode} />
            ))}
            {!streaming && turns.length > 0 && (() => {
              const last = turns[turns.length - 1];
              const prevUser = [...turns].reverse().find((t) => t.role === "user");
              if (last.role !== "assistant" || !last.content) return null;
              return (
                <FollowUps
                  lastQuestion={prevUser?.content ?? ""}
                  answer={last.content}
                  structured={last.structured}
                  onPick={sendMessage}
                />
              );
            })()}
          </div>
          <form onSubmit={onSubmit} className="border-t border-gray-200 p-3 flex items-end gap-2 bg-white">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
              placeholder={t("chat_input_placeholder")}
              aria-label={t("chat_input_placeholder")}
              rows={2}
              className="ek-input resize-none flex-1"
            />
            <VoiceInput language={language} onTranscript={(text) => setInput(text)} ariaLabel={t("voice_input")} />
            <button type="submit" disabled={streaming || !input.trim()} aria-label={t("ask_zana")} className="ek-cta-primary px-4">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>

        <aside className="space-y-3">
          <h2 className="ek-page-title text-sm uppercase tracking-wide">{t("citations")}</h2>
          {allCitations.length === 0 && (
            <p className="text-gray-500 text-xs">{turns.length === 0 ? t("chat_empty_desc") : "Asnjë citim ende."}</p>
          )}
          {allCitations.map((c, i) => (
            <CitationCard key={`${c.marker}-${i}`} citation={c} />
          ))}
          {simpleMode && (
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 text-center">
              ✓ {t("simple_mode")}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ChatBubble({ turn, simpleMode }: { turn: ChatTurn; simpleMode: boolean }) {
  const isUser = turn.role === "user";
  return (
    <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm " +
          (isUser ? "bg-blue-600 text-white whitespace-pre-line shadow-md" : "bg-white border border-gray-200 shadow-sm")
        }
      >
        {isUser ? (
          turn.content || <span className="ek-text-muted">…</span>
        ) : turn.content ? (
          <Markdown text={turn.content} citations={turn.citations ?? []} />
        ) : (
          <span className="ek-text-muted">…</span>
        )}
        {!isUser && turn.structured && (
          <div className="space-y-2">
            <ProcedureBlock structured={turn.structured} />
            <QuickActions structured={turn.structured} />
          </div>
        )}
        {!isUser && turn.content && (
          <div className="pt-2 flex justify-end items-center gap-1">
            <ReactionButtons
              query={turn.userQuery ?? ""}
              answer={turn.content}
              serviceId={turn.structured?.service_id}
            />
            <ReadAloudButton text={turn.content} language={turn.language ?? "sq"} />
          </div>
        )}
        {!isUser && simpleMode && (
          <span className="mt-2 inline-block rounded-full bg-blue-50 text-blue-600 px-2 py-0.5 text-xs font-bold">✓ Simple</span>
        )}
      </div>
    </div>
  );
}

function ProcedureBlock({ structured }: { structured: StructuredProcedure }) {
  const rows = useMemo(
    () => [
      { icon: "📋", label: "Dokumentet", value: structured.documents.join(", ") || "—" },
      { icon: "💶", label: "Tarifa", value: structured.fee || "—" },
      { icon: "⏱️", label: "Koha", value: structured.duration || "—" },
      { icon: "🏢", label: "Zyra", value: structured.office || "—" },
    ],
    [structured],
  );

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-blue-50 p-3 text-black space-y-1 text-xs">
      <p className="font-bold text-blue-700">{structured.name}</p>
      {rows.map((row) => (
        <div key={row.label} className="flex items-start gap-2">
          <span>{row.icon}</span>
          <span className="font-bold">{row.label}:</span>
          <span className="text-gray-500">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
