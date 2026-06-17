"use client";

import { Loader2, Play } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { streamChat } from "@/lib/stream";
import { useStore } from "@/lib/store";

interface Run {
  label: string;
  text: string;
  citations: number;
}

export default function PlaygroundPage() {
  const language = useStore((s) => s.language);
  const simpleMode = useStore((s) => s.simpleMode);
  const [query, setQuery] = useState("Sa kushton pasaporta?");
  const [busy, setBusy] = useState(false);
  const [withRag, setWithRag] = useState<Run | null>(null);
  const [withoutRag, setWithoutRag] = useState<Run | null>(null);

  async function runOne(label: string, useService: boolean): Promise<Run> {
    let text = "";
    let citations = 0;
    for await (const event of streamChat({
      message: query,
      language,
      simple_mode: simpleMode,
      service_id: useService ? "pasaporta" : undefined,
    })) {
      if (event.type === "token") text += event.content;
      if (event.type === "citations") citations = event.citations.length;
    }
    return { label, text, citations };
  }

  async function run() {
    setBusy(true);
    setWithRag(null);
    setWithoutRag(null);
    try {
      const [withFilter, withoutFilter] = await Promise.all([
        runOne("Me filtër (pasaporta)", true),
        runOne("Pa filtër", false),
      ]);
      setWithRag(withFilter);
      setWithoutRag(withoutFilter);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="ek-page-title text-2xl">Playground (RAG vs no-RAG)</h1>
      <Card>
        <CardContent className="space-y-2 pt-6">
          <Label>Pyetja</Label>
          <Textarea rows={2} value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button onClick={run} disabled={busy || !query.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Ekzekuto
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {[withRag, withoutRag].map((run, idx) => (
          <Card key={idx}>
            <CardHeader>
              <CardTitle>{run?.label ?? (idx === 0 ? "Me filtër" : "Pa filtër")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">Citations: {run?.citations ?? 0}</p>
              <pre className="whitespace-pre-wrap text-sm">
                {run?.text || (busy ? "Po gjeneron..." : "—")}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
