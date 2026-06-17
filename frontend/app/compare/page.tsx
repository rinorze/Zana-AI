"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ExternalLink, MessageSquare, XCircle } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";

import { PageHero } from "@/components/PageHero";
import { compareServices, listServices, type CompareEntry, type ServiceListItem } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="container py-8 ek-text-muted">Loading…</div>}>
      <CompareInner />
    </Suspense>
  );
}

function CompareInner() {
  const t = useT();
  const language = useStore((s) => s.language);
  const search = useSearchParams();
  const initialA = search?.get("a") ?? "";
  const initialB = search?.get("b") ?? "";

  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [result, setResult] = useState<{ a: CompareEntry; b: CompareEntry } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listServices({ language, limit: 200 })
      .then((p) => setServices(p.items))
      .catch(() => setServices([]));
  }, [language]);

  useEffect(() => {
    if (!a || !b || a === b) return;
    setBusy(true);
    setError(null);
    compareServices(a, b, language)
      .then(setResult)
      .catch((err) => setError(String(err)))
      .finally(() => setBusy(false));
  }, [a, b, language]);

  const rows = useMemo(() => {
    if (!result) return [];
    return [
      { label: t("fee"), av: result.a.fee, bv: result.b.fee },
      { label: t("duration"), av: result.a.duration, bv: result.b.duration },
      { label: t("office"), av: result.a.office, bv: result.b.office },
      { label: t("documents_required"), av: `${result.a.required_documents.length}`, bv: `${result.b.required_documents.length}` },
      { label: "Hapat", av: `${result.a.step_count}`, bv: `${result.b.step_count}` },
      { label: "FAQ", av: `${result.a.faq_count}`, bv: `${result.b.faq_count}` },
    ];
  }, [result, t]);

  return (
    <div>
      <PageHero
        eyebrow="Krahasim shërbimesh"
        title="Krahaso shërbimet"
        subtitle="Vendos dy shërbime krah për krah për të parë dallimet."
      />

      <div className="container py-8 space-y-6">
        <section className="grid gap-3 md:grid-cols-2">
          <ServicePicker label="Shërbimi A" value={a} onChange={setA} options={services} disabled={busy} />
          <ServicePicker label="Shërbimi B" value={b} onChange={setB} options={services} disabled={busy} />
        </section>

        {error && <p className="text-sm text-ek-danger">{error}</p>}
        {!result && !error && !busy && (
          <p className="ek-text-muted text-sm">Zgjedh dy shërbime për të nisur krahasimin.</p>
        )}
        {busy && <p className="ek-text-muted text-sm">Po ngarkohet…</p>}

        {result && (
          <section className="ek-glass-card overflow-hidden">
            <header className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 p-4 border-b ek-border bg-brand-light">
              <span className="text-xs uppercase tracking-wide ek-text-muted font-bold">Atribut</span>
              <CompareHeader entry={result.a} />
              <CompareHeader entry={result.b} />
            </header>

            <div className="divide-y ek-border">
              {rows.map((row) => (
                <div key={row.label} className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 p-3 text-sm">
                  <span className="ek-text-muted">{row.label}</span>
                  <span className="font-medium">{row.av || "—"}</span>
                  <span className="font-medium">{row.bv || "—"}</span>
                </div>
              ))}
              <DocsRow a={result.a.required_documents} b={result.b.required_documents} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function CompareHeader({ entry }: { entry: CompareEntry }) {
  return (
    <div className="space-y-1">
      <p className="font-bold ek-text-brand">{entry.name || entry.service_id}</p>
      <p className="text-[11px] ek-text-muted">{entry.category}</p>
      <div className="flex gap-2 pt-1">
        <Link
          href={`/services/${encodeURIComponent(entry.service_id)}`}
          className="text-[11px] ek-text-secondary hover:underline inline-flex items-center gap-1"
        >
          <ExternalLink className="h-3 w-3" /> Hap
        </Link>
        <Link
          href={`/chat?q=${encodeURIComponent(entry.name)}&service=${encodeURIComponent(entry.service_id)}`}
          className="text-[11px] ek-text-secondary hover:underline inline-flex items-center gap-1"
        >
          <MessageSquare className="h-3 w-3" /> Pyet
        </Link>
      </div>
    </div>
  );
}

function DocsRow({ a, b }: { a: string[]; b: string[] }) {
  const all = Array.from(new Set([...a, ...b])).sort();
  if (all.length === 0) return null;
  const setA = new Set(a);
  const setB = new Set(b);
  return (
    <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 p-3 text-sm">
      <span className="ek-text-muted">Dokumentet e nevojshme</span>
      <DocsCol items={all} present={setA} />
      <DocsCol items={all} present={setB} />
    </div>
  );
}

function DocsCol({ items, present }: { items: string[]; present: Set<string> }) {
  return (
    <ul className="space-y-1 text-xs">
      {items.map((doc) => (
        <li key={doc} className="flex items-start gap-1.5">
          {present.has(doc) ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 ek-text-muted mt-0.5 flex-shrink-0" />
          )}
          <span className={present.has(doc) ? "" : "ek-text-muted line-through"}>{doc}</span>
        </li>
      ))}
    </ul>
  );
}

function ServicePicker({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ServiceListItem[];
  disabled?: boolean;
}) {
  return (
    <label className="ek-card p-3 space-y-1 block">
      <span className="text-xs uppercase tracking-wide ek-text-muted font-bold">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="ek-input"
      >
        <option value="">Zgjedh shërbim…</option>
        {options.map((s) => (
          <option key={s.service_id} value={s.service_id}>
            {s.name || s.service_id}
          </option>
        ))}
      </select>
    </label>
  );
}
