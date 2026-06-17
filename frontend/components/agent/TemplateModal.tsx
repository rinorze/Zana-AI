"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { personalizeTemplate } from "@/lib/api";
import { pickLocalized } from "@/lib/utils";

export interface AgentTemplate {
  id: number;
  service_id: number;
  scenario: string;
  templates: Record<string, string>;
  placeholders: string[];
}

export function TemplateModal({
  template,
  open,
  onOpenChange,
  language,
}: {
  template: AgentTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      const initial: Record<string, string> = {};
      for (const ph of template.placeholders) initial[ph] = "";
      setValues(initial);
      setOutput("");
      setError(null);
    }
  }, [template]);

  if (!template) return null;

  const baseText = pickLocalized(template.templates, language);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const result = await personalizeTemplate({
        template_id: template!.id,
        language,
        variables: values,
      });
      setOutput(result.text);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template.scenario}</DialogTitle>
          <DialogDescription>{baseText}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {template.placeholders.map((ph) => (
            <div key={ph} className="space-y-1">
              <label htmlFor={`ph-${ph}`} className="text-xs font-bold ek-text-brand uppercase tracking-wide">{ph}</label>
              <input
                id={`ph-${ph}`}
                value={values[ph] ?? ""}
                onChange={(e) => setValues({ ...values, [ph]: e.target.value })}
                className="ek-input"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-ek-danger">{error}</p>}

        <button type="button" onClick={generate} disabled={busy} className="ek-cta-primary text-sm">
          <Sparkles className="h-4 w-4" />
          {busy ? "Po gjeneron..." : "Gjenero"}
        </button>

        {output && (
          <div className="space-y-2">
            <label className="text-xs font-bold ek-text-brand uppercase tracking-wide">Rezultati</label>
            <textarea value={output} readOnly rows={5} className="ek-input resize-none" />
            <button
              type="button"
              className="ek-cta-outline text-xs"
              onClick={() => navigator.clipboard?.writeText(output)}
            >
              Kopjo
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
