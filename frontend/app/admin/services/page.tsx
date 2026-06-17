"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ServiceEditor, emptyServiceDraft, type ServiceDraft } from "@/components/admin/ServiceEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  adminDeleteService,
  adminListServices,
  adminReindexAll,
  adminReindexService,
  adminUpsertService,
  type ServiceDetail,
} from "@/lib/api";

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceDetail[]>([]);
  const [editing, setEditing] = useState<ServiceDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    try {
      setServices(await adminListServices());
    } catch (err) {
      setError(String(err));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await adminUpsertService(editing);
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function reindex(serviceId: string) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await adminReindexService(serviceId);
      setInfo(`U riindeksuan ${res.chunks_indexed} chunks për ${serviceId}.`);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function reindexAll() {
    setBusy(true);
    setError(null);
    try {
      const res = await adminReindexAll();
      setInfo(`U vendos në radhë ${res.queued} shërbime.`);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(serviceId: string) {
    if (!confirm(`Fshi shërbimin ${serviceId}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await adminDeleteService(serviceId);
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <h1 className="ek-page-title text-2xl">Editor shërbimi</h1>
        {error && <p className="text-sm text-ek-danger">{error}</p>}
        <ServiceEditor
          value={editing}
          onChange={setEditing}
          onSave={save}
          onCancel={() => setEditing(null)}
          saving={busy}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="ek-page-title text-2xl">Shërbimet</h1>
        <div className="flex gap-2">
          <Button onClick={() => setEditing(emptyServiceDraft())}>
            <Plus className="h-4 w-4" />
            Shto shërbim
          </Button>
          <Button variant="outline" onClick={reindexAll} disabled={busy}>
            <RefreshCw className="h-4 w-4" />
            Riindeksimi i plotë
          </Button>
        </div>
      </header>

      {error && <p className="text-sm text-ek-danger">{error}</p>}
      {info && <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded">{info}</p>}

      <div className="space-y-2">
        {services.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.names.sq || s.service_id}</span>
                  <Badge variant="muted">{s.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.required_documents.length} dokumente · {s.steps.length} hapa · {s.faqs.length} FAQ
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(s as ServiceDraft)}>
                  Edito
                </Button>
                <Button size="sm" variant="outline" onClick={() => reindex(s.service_id)} disabled={busy}>
                  <RefreshCw className="h-4 w-4" />
                  Riindekso
                </Button>
                <Button size="sm" variant="destructive" onClick={() => remove(s.service_id)} disabled={busy}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
