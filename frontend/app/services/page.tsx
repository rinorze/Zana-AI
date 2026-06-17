"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Baby,
  Briefcase,
  Building2,
  Car,
  FileText,
  HeartHandshake,
  IdCard,
  Map,
  Search,
  ScrollText,
  Sparkles,
  Users,
} from "lucide-react";

import { PageHero } from "@/components/PageHero";
import { listServices, type ServiceListItem } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pasaporta: FileText,
  leternjoftim: IdCard,
  "certifikate-lindjeje": Baby,
  "certifikate-martese": HeartHandshake,
  "certifikate-vdekjeje": ScrollText,
  "regjistrim-biznesi": Briefcase,
  "patente-shoferi": Car,
  "ekstrakt-amze": ScrollText,
  "certifikate-gjendjes-martesore": Users,
  "leje-qendrimi-huaj": Building2,
};

type AudienceFilter = "all" | "citizen" | "business" | "paid";
const AUDIENCE_KEYS: Record<AudienceFilter, "audience_all" | "audience_citizen" | "audience_business" | "audience_paid"> = {
  all: "audience_all",
  citizen: "audience_citizen",
  business: "audience_business",
  paid: "audience_paid",
};

export default function ServicesPage() {
  const t = useT();
  const language = useStore((s) => s.language);
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<AudienceFilter>("all");
  const [category, setCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listServices({ language, limit: 200 })
      .then((page) => setServices(page.items))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [language]);

  const categories = useMemo(() => {
    const set = new Set(services.map((s) => s.category).filter(Boolean));
    return Array.from(set).sort();
  }, [services]);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (category && s.category !== category) return false;
      if (audience === "business" && !/(biznes|business)/i.test(s.category)) return false;
      if (audience === "paid" && !s.fee) return false;
      if (audience === "citizen" && /(biznes|business)/i.test(s.category)) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.service_id.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    });
  }, [services, query, audience, category]);

  return (
    <div>
      <PageHero
        eyebrow={`${services.length || ""} ${t("services").toLowerCase()}`}
        title={t("services_portal")}
        subtitle={t("services_portal_subtitle")}
        actions={
          <div className="ek-glass p-3 flex items-center gap-2 min-w-[300px]">
            <Search className="h-4 w-4 ek-text-muted ml-1" />
            <input
              placeholder={t("search_service")}
              aria-label={t("search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
        }
      />

      <div className="container py-8 space-y-8">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Audience filter">
          {(Object.keys(AUDIENCE_KEYS) as AudienceFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              className="ek-chip"
              aria-pressed={audience === key}
              onClick={() => setAudience(key)}
            >
              <span className="dot" />
              {t(AUDIENCE_KEYS[key])}
            </button>
          ))}
        </div>

      {/* Highlighted "life event" callout */}
      <section className="space-y-3 relative">
        <span className="ek-deco-blob rose absolute -top-4 left-1/3 h-32 w-32" aria-hidden="true" />
        <h2 className="ek-page-title text-xl relative z-10">{t("life_event")}</h2>
        <Link
          href="/services/certifikate-lindjeje"
          className="ek-glass-card relative z-10 flex items-center gap-4 p-5 hover:translate-y-[-2px] transition-transform"
        >
          <span className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-rose-100 to-rose-200 items-center justify-center text-rose-700">
            <Baby className="h-8 w-8" />
          </span>
          <div className="flex-1">
            <p className="font-bold ek-text-brand text-lg">{t("life_event_title")}</p>
            <p className="text-sm ek-text-muted">{t("life_event_desc")}</p>
          </div>
          <span className="ek-tag">{t("explore_services")}</span>
        </Link>
      </section>

      {/* Services grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="ek-page-title text-xl">{t("services")}</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={cn("ek-chip", category === null && "active")}
              aria-pressed={category === null}
            >
              <span className="dot" />
              {t("services_all")}
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn("ek-chip", category === c && "active")}
                aria-pressed={category === c}
              >
                <span className="dot" />
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-ek-danger">{error}</p>}
        {loading && <p className="ek-text-muted text-sm">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <div className="ek-card p-8 text-center ek-text-muted">{t("no_results")}</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((s) => {
            const Icon = ICONS[s.service_id] ?? Map;
            return (
              <Link
                key={s.id}
                href={`/services/${encodeURIComponent(s.service_id)}`}
                className="ek-tile-premium flex flex-col items-center text-center gap-3 no-underline"
              >
                <span className="inline-flex h-12 w-12 rounded-full bg-brand-light items-center justify-center ek-text-brand">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="font-bold ek-text-secondary text-sm">{s.name || s.service_id}</span>
                {s.category && <span className="text-[10px] ek-text-muted uppercase tracking-wider">{s.category}</span>}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Ask ZANA promo strip */}
      <section className="ek-card p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-brand-light border-brand-soft">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 rounded-full bg-white items-center justify-center ek-text-brand">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold ek-text-brand">{t("ask_zana_promo_title")}</p>
            <p className="text-sm ek-text-muted">{t("ask_zana_promo_desc")}</p>
          </div>
        </div>
        <Link href="/chat" className="ek-cta-primary">{t("ask_zana")}</Link>
      </section>
      </div>
    </div>
  );
}
