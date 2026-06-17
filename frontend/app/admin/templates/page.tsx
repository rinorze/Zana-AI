"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  adminDeleteTemplate,
  adminListServices,
  adminListTemplates,
  adminUpsertTemplate,
  type ServiceDetail,
} from "@/lib/api";
import { LANGUAGES } from "@/lib/i18n";

interface Draft {
  service_service_id: string;
  scenario: string;
  templates: Record<string, string>;
  placeholders: string;
}

const EMPTY: Draft = {
  service_service_id: "",
  scenario: "",
  templates: { sq: "", en: "", sr: "" },
  placeholders: "",
};

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<
    Array<{ id: number; service_id: number; scenario: string; templates: Record<string, string>; placeholders: string[] }>
  >([]);
  const [services, setServices] = useState<ServiceDetail[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const [t, s] = await Promise.all([adminListTemplates(), adminListServices()]);
      setTemplates(t);
      setServices(s);
    } catch (err) {
      setError(String(err));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function save() {
    if (!draft.service_service_id || !draft.scenario) {
      setError("Plotëso service_id dhe skenarin.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminUpsertTemplate({
        service_service_id: draft.service_service_id,
        scenario: draft.scenario,
        templates: draft.templates,
        placeholders: draft.placeholders.split(",").map((p) => p.trim()).filter(Boolean),
      });
      setDraft(EMPTY);
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Fshi këtë template?")) return;
    setBusy(true);
    try {
      await adminDeleteTemplate(id);
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="ek-page-title text-2xl">Template-at</h1>

      <Card>
        <CardHeader>
          <CardTitle>Krijo ose përditëso template</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Shërbimi</Label>
              <select
                value={draft.service_service_id}
                onChange={(e) => setDraft({ ...draft, service_service_id: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Zgjidh shërbimin...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.service_id}>
                    {s.names.sq || s.service_id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Skenari</Label>
              <Input
                value={draft.scenario}
                onChange={(e) => setDraft({ ...draft, scenario: e.target.value })}
                placeholder="first_time_application"
              />
            </div>
          </div>

          {LANGUAGES.map((lang) => (
            <div key={lang} className="space-y-1">
              <Label>Template ({lang.toUpperCase()})</Label>
              <Textarea
                rows={3}
                value={draft.templates[lang] ?? ""}
                onChange={(e) => setDraft({ ...draft, templates: { ...draft.templates, [lang]: e.target.value } })}
              />
            </div>
          ))}

          <div className="space-y-1">
            <Label>Placeholders (ndarje me presje)</Label>
            <Input
              value={draft.placeholders}
              onChange={(e) => setDraft({ ...draft, placeholders: e.target.value })}
              placeholder="citizen_name, fee, duration"
            />
          </div>

          {error && <p className="text-sm text-ek-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(EMPTY)} disabled={busy}>
              Reset
            </Button>
            <Button onClick={save} disabled={busy}>
              Ruaj
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {templates.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.scenario}</span>
                <Button size="icon" variant="ghost" onClick={() => remove(t.id)} aria-label="Fshi">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Service #{t.service_id} · Placeholders: {(t.placeholders ?? []).join(", ") || "—"}
              </p>
              <p className="text-sm whitespace-pre-line">{t.templates.sq}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
