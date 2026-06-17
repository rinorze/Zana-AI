"use client";

import { Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminDeleteDocument, adminListDocuments, adminUploadDocument } from "@/lib/api";

type DocRow = Awaited<ReturnType<typeof adminListDocuments>>[number];

export default function AdminDocumentsPage() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      setDocs(await adminListDocuments());
    } catch (err) {
      setError(String(err));
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, []);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      await adminUploadDocument(file);
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: number) {
    if (!confirm("Fshi këtë dokument?")) return;
    setBusy(true);
    try {
      await adminDeleteDocument(id);
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="ek-page-title text-2xl">Dokumentet</h1>
        <Button onClick={() => inputRef.current?.click()} disabled={busy}>
          <Upload className="h-4 w-4" />
          Ngarko (PDF/DOCX/TXT)
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
      </header>

      {error && <p className="text-sm text-ek-danger">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Të ngarkuara ({docs.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {docs.length === 0 && <p className="text-sm text-muted-foreground">Asnjë dokument.</p>}
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div className="space-y-1">
                <p className="font-medium">{doc.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.file_type.toUpperCase()} · {doc.chunk_count} chunks ·{" "}
                  {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={doc.indexed ? "success" : "muted"}>
                  {doc.indexed ? "I indeksuar" : "Në pritje"}
                </Badge>
                <Button size="icon" variant="ghost" onClick={() => remove(doc.id)} aria-label="Fshi">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
