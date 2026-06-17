"use client";

import { User } from "lucide-react";

import type { ServiceListItem } from "@/lib/api";

export interface CallerContext {
  citizenName: string;
  serviceId: string | null;
}

export function CallerContextPanel({
  context,
  onChange,
  services,
}: {
  context: CallerContext;
  onChange: (next: CallerContext) => void;
  services: ServiceListItem[];
}) {
  return (
    <section className="ek-card p-5 space-y-3">
      <h2 className="ek-page-title text-sm flex items-center gap-2">
        <User className="h-4 w-4 ek-text-secondary" />
        Konteksti i thirrjes
      </h2>
      <div className="space-y-2">
        <label htmlFor="caller-name" className="text-xs font-bold ek-text-brand uppercase tracking-wide">Emri i qytetarit</label>
        <input
          id="caller-name"
          value={context.citizenName}
          onChange={(e) => onChange({ ...context, citizenName: e.target.value })}
          placeholder="opsionale"
          className="ek-input"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="service" className="text-xs font-bold ek-text-brand uppercase tracking-wide">Shërbimi</label>
        <select
          id="service"
          value={context.serviceId ?? ""}
          onChange={(e) => onChange({ ...context, serviceId: e.target.value || null })}
          className="ek-input"
        >
          <option value="">— pa filtra —</option>
          {services.map((s) => (
            <option key={s.service_id} value={s.service_id}>
              {s.name || s.service_id}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
