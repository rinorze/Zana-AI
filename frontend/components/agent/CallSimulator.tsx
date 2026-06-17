"use client";

import { Pause, Play, RefreshCw, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ServiceListItem } from "@/lib/api";

export interface SimulatorScenario {
  id: string;
  title: string;
  service_id: string | null;
  citizen_name: string;
  steps: string[];
}

export const SCENARIOS: SimulatorScenario[] = [
  {
    id: "first-passport",
    title: "Qytetar po aplikon për pasaportë për herë të parë",
    service_id: "pasaporta",
    citizen_name: "Arben Berisha",
    steps: [
      "Sa kushton pasaporta?",
      "Cilat dokumente duhen për pasaportë për herë të parë?",
      "Sa kohë zgjat procesi?",
      "A mund të aplikoj online?",
    ],
  },
  {
    id: "lost-id",
    title: "Qytetar ka humbur letërnjoftimin",
    service_id: "leternjoftim",
    citizen_name: "Mirjeta Krasniqi",
    steps: [
      "Kam humbur letërnjoftimin, çfarë duhet të bëj?",
      "Sa kushton ripërsëritja e letërnjoftimit?",
      "A duhet të lajmëroj policinë?",
    ],
  },
  {
    id: "register-business",
    title: "Qytetar po regjistron biznes të ri",
    service_id: "regjistrim-biznesi",
    citizen_name: "Driton Hoxha",
    steps: [
      "Si regjistrohem si biznes individual?",
      "Sa zgjat regjistrimi te ARBK?",
      "A nevojitet kapital fillestar?",
    ],
  },
];

const STEP_DELAY_MS = 4000;

export function CallSimulator({
  services,
  onScenarioChange,
  onSimulatedQuery,
}: {
  services: ServiceListItem[];
  onScenarioChange: (s: SimulatorScenario | null) => void;
  onSimulatedQuery: (query: string) => void;
}) {
  const [running, setRunning] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = SCENARIOS.find((s) => s.id === activeId) ?? null;

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function start(scenario: SimulatorScenario) {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveId(scenario.id);
    setStepIndex(0);
    setRunning(true);
    onScenarioChange(scenario);
    onSimulatedQuery(scenario.steps[0]);
    schedule(scenario, 1);
  }

  function schedule(scenario: SimulatorScenario, next: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (next >= scenario.steps.length) {
      timerRef.current = setTimeout(() => setRunning(false), STEP_DELAY_MS);
      return;
    }
    timerRef.current = setTimeout(() => {
      setStepIndex(next);
      onSimulatedQuery(scenario.steps[next]);
      schedule(scenario, next + 1);
    }, STEP_DELAY_MS);
  }

  function pause() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRunning(false);
  }

  function resume() {
    if (!active) return;
    setRunning(true);
    schedule(active, stepIndex + 1);
  }

  function skip() {
    if (!active) return;
    const next = stepIndex + 1;
    if (next >= active.steps.length) {
      pause();
      return;
    }
    setStepIndex(next);
    onSimulatedQuery(active.steps[next]);
    if (running) schedule(active, next + 1);
  }

  function reset() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveId(null);
    setStepIndex(0);
    setRunning(false);
    onScenarioChange(null);
  }

  return (
    <section className="ek-glass-card p-4 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-bold ek-text-brand text-sm flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
            🎬 Simulim i thirrjes
          </h3>
          {!active && (
            <p className="text-xs ek-text-muted mt-1">
              Zgjidh një skenar — sistemi e simulon qytetarin duke shtypur pyetje.
            </p>
          )}
        </div>
        {active && (
          <div className="flex items-center gap-1">
            {running ? (
              <button type="button" className="h-7 w-7 rounded-full bg-white border ek-border inline-flex items-center justify-center" onClick={pause} aria-label="Ndal simulimin">
                <Pause className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button type="button" className="h-7 w-7 rounded-full bg-white border ek-border inline-flex items-center justify-center" onClick={resume} aria-label="Vazhdo simulimin">
                <Play className="h-3.5 w-3.5" />
              </button>
            )}
            <button type="button" className="h-7 w-7 rounded-full bg-white border ek-border inline-flex items-center justify-center" onClick={skip} aria-label="Pyetja tjetër">
              <SkipForward className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="h-7 w-7 rounded-full bg-white border ek-border inline-flex items-center justify-center" onClick={reset} aria-label="Resetim">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </header>

      {!active ? (
        <div className="space-y-2">
          {SCENARIOS.map((s) => {
            const svc = services.find((x) => x.service_id === s.service_id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => start(s)}
                className="w-full text-left bg-white border ek-border rounded-md p-3 hover:border-brand-secondary transition-colors"
              >
                <p className="text-sm font-bold ek-text-brand">{s.title}</p>
                <p className="text-xs ek-text-muted mt-1">
                  👤 {s.citizen_name}
                  {svc && <> · 📂 {svc.name || s.service_id}</>}
                  <> · {s.steps.length} pyetje</>
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs ek-text-muted">
            👤 <strong>{active.citizen_name}</strong> · 📂 {active.service_id ?? "—"}
          </div>
          <ol className="space-y-1.5">
            {active.steps.map((q, idx) => (
              <li
                key={idx}
                className={
                  "text-xs flex items-start gap-2 rounded-md px-2 py-1.5 " +
                  (idx === stepIndex
                    ? "bg-brand-light ek-text-brand font-bold"
                    : idx < stepIndex
                      ? "ek-text-muted line-through"
                      : "ek-text-muted")
                }
              >
                <span className="mt-0.5">{idx === stepIndex ? "▶" : idx < stepIndex ? "✓" : "•"}</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
