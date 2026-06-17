"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, RadioTower } from "lucide-react";

import { PageHero } from "@/components/PageHero";
import { AfterCallSummary } from "@/components/agent/AfterCallSummary";
import { CallSimulator } from "@/components/agent/CallSimulator";
import { CallerContextPanel, type CallerContext } from "@/components/agent/CallerContextPanel";
import { SmartSearchBar } from "@/components/agent/SmartSearchBar";
import { SuggestionsPanel } from "@/components/agent/SuggestionsPanel";
import { TemplatesLibrary } from "@/components/agent/TemplatesLibrary";
import { clearToken, getRole, getToken, listServices, type ServiceListItem } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { AgentSuggestSocket, type SuggestPayload } from "@/lib/websocket";

export default function AgentDashboardPage() {
  const t = useT();
  const router = useRouter();
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [context, setContext] = useState<CallerContext>({ citizenName: "", serviceId: null });
  const [query, setQuery] = useState("");
  const [payload, setPayload] = useState<SuggestPayload | null>(null);
  const [status, setStatus] = useState("idle");
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [usedSuggestions, setUsedSuggestions] = useState<string[]>([]);
  const socketRef = useRef<AgentSuggestSocket | null>(null);

  useEffect(() => {
    if (!getToken() || (getRole() !== "agent" && getRole() !== "admin")) {
      router.replace("/agent/login");
      return;
    }
    listServices({ limit: 200 }).then((page) => setServices(page.items)).catch(console.error);

    const socket = new AgentSuggestSocket({
      onMessage: (next) => {
        setPayload(next);
        if (next.suggestions?.length) {
          setUsedSuggestions((curr) => [...curr, ...next.suggestions.map((s) => s.text)].slice(-10));
        }
      },
      onStatus: setStatus,
    });
    socketRef.current = socket;
    socket.connect();
    return () => socket.close();
  }, [router]);

  function handleDebounced(text: string) {
    if (!text.trim()) {
      setPayload({ suggestions: [], reason: "empty_input" });
      return;
    }
    setQueryHistory((curr) => (curr[curr.length - 1] === text ? curr : [...curr, text].slice(-10)));
    socketRef.current?.send(text, context.serviceId ?? undefined);
  }

  const serviceName = useMemo(() => {
    return services.find((s) => s.service_id === context.serviceId)?.name ?? null;
  }, [services, context.serviceId]);

  function logout() {
    clearToken();
    socketRef.current?.close();
    router.replace("/agent/login");
  }

  const statusColor =
    status === "open" ? "bg-blue-500" : status === "error" ? "bg-red-500" : "bg-yellow-400";

  return (
    <div>
      <PageHero
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span className={"inline-block h-2 w-2 rounded-full " + statusColor} aria-hidden="true" />
            <span className="uppercase tracking-wide text-[10px]">{status}</span>
            <span className="opacity-60">·</span>
            <RadioTower className="h-3.5 w-3.5" />
            Co-Pilot
          </span>
        }
        title={t("agent_dashboard")}
        subtitle={t("agent_dashboard_subtitle")}
        actions={
          <button className="ek-cta-outline text-sm" onClick={logout}>
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </button>
        }
      />

      {/* How it works */}
      <div className="container py-6">
        <HowItWorks />
      </div>

      {/* Main workspace */}
      <div className="container pb-10 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left: search + suggestions */}
        <div className="space-y-4">
          <SmartSearchBar value={query} onChange={setQuery} onDebounced={handleDebounced} />
          <SuggestionsPanel payload={payload} query={query} status={status} />
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <CallSimulator
            services={services}
            onScenarioChange={(s) => {
              if (s) {
                setContext({ citizenName: s.citizen_name, serviceId: s.service_id });
              }
            }}
            onSimulatedQuery={(q) => {
              setQuery(q);
            }}
          />
          <CallerContextPanel context={context} onChange={setContext} services={services} />
          <TemplatesLibrary serviceId={context.serviceId} />
          <AfterCallSummary service={serviceName} queries={queryHistory} suggestions={usedSuggestions} />
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const t = useT();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 rounded-lg bg-yellow-100 text-yellow-700 items-center justify-center font-bold text-sm">1</span>
        <div>
          <p className="font-bold text-black text-sm">{t("agent_step1_title")}</p>
          <p className="text-gray-500 mt-0.5">{t("agent_step1_desc")}</p>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 rounded-lg bg-blue-100 text-blue-700 items-center justify-center font-bold text-sm">2</span>
        <div>
          <p className="font-bold text-black text-sm">{t("agent_step2_title")}</p>
          <p className="text-gray-500 mt-0.5">{t("agent_step2_desc")}</p>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 rounded-lg bg-blue-100 text-blue-700 items-center justify-center font-bold text-sm">3</span>
        <div>
          <p className="font-bold text-black text-sm">{t("agent_step3_title")}</p>
          <p className="text-gray-500 mt-0.5">{t("agent_step3_desc")}</p>
        </div>
      </div>
    </div>
  );
}
