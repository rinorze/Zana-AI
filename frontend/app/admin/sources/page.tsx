"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adminAddSource,
  adminDeleteSource,
  adminListSources,
  adminReindexSource,
} from "@/lib/api";

type SourceRow = Awaited<ReturnType<typeof adminListSources>>[number];

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setSources(await adminListSources());
    } catch (err) {
      setError(String(err));
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, []);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await adminAddSource(url, title);
      setUrl("");
      setTitle("");
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function reindex(id: number) {
    setBusy(true);
    try {
      await adminReindexSource(id);
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Fshi këtë burim?")) return;
    setBusy(true);
    try {
      await adminDeleteSource(id);
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="ek-page-title text-2xl">Burimet (URL)</h1>

      <Card>
        <CardHeader>
          <CardTitle>Shto URL</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[2fr_1fr_auto]">
          <div className="space-y-1">
            <Label>URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://ekosova.rks-gov.net/..."
              type="url"
            />
          </div>
          <div className="space-y-1">
            <Label>Titulli (opsional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1 self-end">
            <Button onClick={add} disabled={busy || !url}>
              <Plus className="h-4 w-4" />
              Shto
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-ek-danger">{error}</p>}

      <div className="space-y-2">
        {sources.map((src) => (
          <Card key={src.id}>
            <CardContent className="p-4 flex items-center justify-between gap-2">
              <div className="space-y-1 truncate">
                <p className="font-medium truncate">{src.title || src.url}</p>
                <p className="text-xs text-muted-foreground truncate">{src.url}</p>
                <p className="text-xs text-muted-foreground">
                  {src.chunk_count} chunks · {src.last_indexed ? new Date(src.last_indexed).toLocaleString() : "—"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={src.status === "indexed" ? "success" : src.status === "error" ? "danger" : "muted"}>
                  {src.status}
                </Badge>
                <Button size="icon" variant="outline" onClick={() => reindex(src.id)} disabled={busy} aria-label="Riindekso">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(src.id)} disabled={busy} aria-label="Fshi">
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
