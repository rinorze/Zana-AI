"use client";

import { Loader2, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { transcribeVoice } from "@/lib/api";
import { cn } from "@/lib/utils";

type Status = "idle" | "asking" | "recording" | "uploading" | "error";

const MAX_SECONDS = 20;
const HINT_OK: Record<string, boolean> = { en: true }; // sq/sr -> let Whisper auto-detect

export function VoiceInput({
  onTranscript,
  language,
  ariaLabel = "Record voice question",
}: {
  onTranscript: (text: string) => void;
  language?: string;
  ariaLabel?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function cleanup() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setSeconds(0);
  }

  useEffect(() => () => cleanup(), []);

  async function start() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Voice not supported in this browser.");
      setStatus("error");
      return;
    }
    setStatus("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (tickRef.current) clearInterval(tickRef.current);
        if (chunksRef.current.length === 0) {
          cleanup();
          setStatus("idle");
          return;
        }
        setStatus("uploading");
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const hint = language && HINT_OK[language] ? language : undefined;
          const result = await transcribeVoice(blob, hint);
          if (result.text) onTranscript(result.text);
          else setError("No speech detected.");
          setStatus(result.text ? "idle" : "error");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg.length > 140 ? msg.slice(0, 140) + "…" : msg);
          setStatus("error");
        } finally {
          cleanup();
        }
      };

      recorder.onerror = (e) => {
        setError(`Recorder error: ${(e as ErrorEvent).message ?? "unknown"}`);
        setStatus("error");
        cleanup();
      };

      recorder.start();
      recorderRef.current = recorder;
      setStatus("recording");
      setSeconds(0);
      tickRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_SECONDS) {
            recorder.stop();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes("denied") ? "Microphone permission denied." : msg);
      setStatus("error");
      cleanup();
    }
  }

  function stop() {
    try {
      recorderRef.current?.stop();
    } catch {
      cleanup();
      setStatus("idle");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={status === "recording" ? stop : start}
        disabled={status === "asking" || status === "uploading"}
        aria-label={status === "recording" ? "Stop recording" : ariaLabel}
        className={cn(
          "inline-flex items-center justify-center h-10 rounded-full transition-colors border",
          status === "recording"
            ? "bg-rose-500 text-white border-rose-500 px-4 gap-2 ek-recording-pulse"
            : "bg-white text-brand-secondary border-brand-secondary hover:bg-brand-light w-10",
          status === "uploading" ? "opacity-70 cursor-wait" : "",
        )}
      >
        {status === "uploading" || status === "asking" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === "recording" ? (
          <>
            <span className="block w-2 h-2 bg-white rounded-full animate-pulse" aria-hidden="true" />
            <Square className="h-3 w-3" />
            <span className="text-xs font-bold tabular-nums">
              {seconds}s
            </span>
          </>
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
      {error && (
        <span
          role="alert"
          className="absolute top-full mt-1 right-0 z-50 whitespace-nowrap text-xs bg-rose-50 text-rose-900 px-2 py-1 rounded shadow-sm border border-rose-200"
          onClick={() => setError(null)}
        >
          {error}
        </span>
      )}
    </div>
  );
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      // ignore
    }
  }
  return undefined;
}
