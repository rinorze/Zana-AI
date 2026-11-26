"use client";

import { FileSpreadsheet } from "lucide-react";
import { useEffect, useState } from "react";

import { type AgentTemplate, TemplateModal } from "@/components/agent/TemplateModal";
import { listAgentTemplates } from "@/lib/api";
import { useStore } from "@/lib/store";
import { pickLocalized } from "@/lib/utils";

export function TemplatesLibrary({ serviceId }: { serviceId: string | null }) {
  const language = useStore((s) => s.language);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [selected, setSelected] = useState<AgentTemplate | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAgentTemplates(serviceId ?? undefined)
      .then(setTemplates)
      .catch((err) => setError(String(err)));
  }, [serviceId]);

  return (
    <section className="ek-card p-5 space-y-3">
      <h2 className="ek-page-title text-sm flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 ek-text-secondary" />
        Template-at
        {templates.length > 0 && (
          <span className="ml-auto text-xs font-normal ek-text-muted">{templates.length}</span>
        )}
      </h2>
      {error && <p className="text-sm text-ek-danger">{error}</p>}
      {templates.length === 0 && !error && (
        <p className="text-sm ek-text-muted">Asnjë template për këtë shërbim.</p>
      )}
      <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            className="w-full text-left bg-white border ek-border rounded-md p-3 hover:border-brand-secondary transition-colors"
            onClick={() => {
              setSelected(t);
              setOpen(true);
            }}
          >
            <p className="text-sm font-bold ek-text-brand">{scenarioLabel(t.scenario)}</p>
            <p className="text-xs ek-text-muted line-clamp-2 mt-1">{pickLocalized(t.templates, language)}</p>
          </button>
        ))}
      </div>
      <TemplateModal template={selected} open={open} onOpenChange={setOpen} language={language} />
    </section>
  );
}

/** "first_time_application" -> "First time application". */
function scenarioLabel(scenario: string): string {
  const words = scenario.replace(/_/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
