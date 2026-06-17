"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGES, type Language } from "@/lib/i18n";
import type { ServiceDetail } from "@/lib/api";

export type ServiceDraft = ServiceDetail;

const EMPTY_DRAFT: ServiceDraft = {
  id: 0,
  service_id: "",
  category: "",
  names: { sq: "", en: "", sr: "" },
  description: { sq: "", en: "", sr: "" },
  fee: "",
  duration: "",
  office: "",
  office_locations: [],
  required_documents: [],
  source_urls: [],
  last_verified: "",
  steps: [],
  faqs: [],
  response_templates: [],
};

export function emptyServiceDraft(): ServiceDraft {
  return JSON.parse(JSON.stringify(EMPTY_DRAFT));
}

export function ServiceEditor({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  value: ServiceDraft;
  onChange: (next: ServiceDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [tab, setTab] = useState<Language>("sq");

  function setLocalized(field: "names" | "description", text: string) {
    onChange({ ...value, [field]: { ...value[field], [tab]: text } });
  }

  function setRequiredDocs(line: string) {
    onChange({ ...value, required_documents: line.split("\n").map((s) => s.trim()).filter(Boolean) });
  }

  function setSourceUrls(line: string) {
    onChange({ ...value, source_urls: line.split("\n").map((s) => s.trim()).filter(Boolean) });
  }

  function addStep() {
    onChange({
      ...value,
      steps: [
        ...value.steps,
        {
          id: 0,
          order: value.steps.length + 1,
          titles: { sq: "", en: "", sr: "" },
          descriptions: { sq: "", en: "", sr: "" },
          required_items: [],
        },
      ],
    });
  }

  function updateStep(index: number, patch: Partial<ServiceDraft["steps"][number]>) {
    const next = value.steps.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange({ ...value, steps: next });
  }

  function removeStep(index: number) {
    const next = value.steps.filter((_, i) => i !== index);
    onChange({ ...value, steps: next });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {LANGUAGES.map((lang) => (
          <Button
            key={lang}
            type="button"
            size="sm"
            variant={tab === lang ? "default" : "outline"}
            onClick={() => setTab(lang)}
          >
            {lang.toUpperCase()}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-2 pt-6">
          <div className="space-y-1">
            <Label>service_id</Label>
            <Input
              value={value.service_id}
              onChange={(e) => onChange({ ...value, service_id: e.target.value })}
              placeholder="pasaporta"
            />
          </div>
          <div className="space-y-1">
            <Label>Kategoria</Label>
            <Input value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Emri ({tab.toUpperCase()})</Label>
            <Input value={value.names[tab] ?? ""} onChange={(e) => setLocalized("names", e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Përshkrimi ({tab.toUpperCase()})</Label>
            <Textarea
              rows={3}
              value={value.description[tab] ?? ""}
              onChange={(e) => setLocalized("description", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Tarifa</Label>
            <Input value={value.fee} onChange={(e) => onChange({ ...value, fee: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Kohëzgjatja</Label>
            <Input value={value.duration} onChange={(e) => onChange({ ...value, duration: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Zyra</Label>
            <Input value={value.office} onChange={(e) => onChange({ ...value, office: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Last verified</Label>
            <Input
              value={value.last_verified}
              onChange={(e) => onChange({ ...value, last_verified: e.target.value })}
              placeholder="2026-05-21"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Dokumentet e nevojshme (një për rresht)</Label>
            <Textarea
              rows={3}
              value={value.required_documents.join("\n")}
              onChange={(e) => setRequiredDocs(e.target.value)}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Source URLs (një për rresht)</Label>
            <Textarea
              rows={2}
              value={value.source_urls.join("\n")}
              onChange={(e) => setSourceUrls(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Hapat ({value.steps.length})</span>
            <Button type="button" size="sm" variant="outline" onClick={addStep}>
              <Plus className="h-4 w-4" />
              Shto hap
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {value.steps.map((step, idx) => (
            <div key={idx} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">#{step.order || idx + 1}</span>
                <Button type="button" size="icon" variant="ghost" onClick={() => removeStep(idx)} aria-label="Fshi hap">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={step.titles[tab] ?? ""}
                  onChange={(e) => updateStep(idx, { titles: { ...step.titles, [tab]: e.target.value } })}
                  placeholder={`Titulli (${tab.toUpperCase()})`}
                />
                <Input
                  type="number"
                  value={step.order}
                  onChange={(e) => updateStep(idx, { order: Number(e.target.value) || 0 })}
                />
              </div>
              <Textarea
                rows={2}
                value={step.descriptions[tab] ?? ""}
                onChange={(e) => updateStep(idx, { descriptions: { ...step.descriptions, [tab]: e.target.value } })}
                placeholder={`Përshkrimi (${tab.toUpperCase()})`}
              />
              <Textarea
                rows={2}
                value={(step.required_items ?? []).join("\n")}
                onChange={(e) =>
                  updateStep(idx, {
                    required_items: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Required items (një për rresht)"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Anulo
        </Button>
        <Button type="button" onClick={onSave} disabled={saving || !value.service_id.trim()}>
          {saving ? "Po ruan..." : "Ruaj"}
        </Button>
      </div>
    </div>
  );
}
