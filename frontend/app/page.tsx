"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Baby,
  Briefcase,
  Building2,
  Car,
  FileText,
  HeartPulse,
  IdCard,
  Languages,
  LayoutDashboard,
  Mic,
  Radio,
  ScrollText,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Zap,
} from "lucide-react";

import { HomeChat } from "@/components/citizen/HomeChat";
import { listServices, type ServiceListItem } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pasaporta: FileText,
  leternjoftim: IdCard,
  "certifikate-lindjeje": Baby,
  "certifikate-martese": Users,
  "certifikate-vdekjeje": ScrollText,
  "regjistrim-biznesi": Briefcase,
  "patente-shoferi": Car,
  "ekstrakt-amze": ScrollText,
  "certifikate-gjendjes-martesore": Users,
  "leje-qendrimi-huaj": Building2,
};

export default function HomePage() {
  const t = useT();
  const language = useStore((s) => s.language);
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [totalServices, setTotalServices] = useState(0);
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    setLoadingServices(true);
    listServices({ language, limit: 200 })
      .then((page) => {
        setServices(page.items);
        setTotalServices(page.total);
      })
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));
  }, [language]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white border-b border-gray-100">
        {/* Subtle gradient background */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white to-yellow-50/40"
          aria-hidden="true"
        />
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-yellow-100/50 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4"
          aria-hidden="true"
        />

        <div className="container relative z-10 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            {/* Badge */}
            <span className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-4 py-1.5 text-xs font-bold text-black shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              ZANA · eKosova AI
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            </span>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight text-black">
              {t("hero_title_premium_line1")}
              <br />
              <span className="text-blue-600">
                {t("hero_title_premium_line2")}
              </span>
            </h1>

            <p className="text-gray-500 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              {t("hero_subtitle")}
            </p>

            {/* Chat input */}
            <div className="bg-white rounded-2xl p-4 md:p-5 max-w-2xl mx-auto">
              <HomeChat />
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/chat" className="ek-cta-primary text-sm">
                {t("ask_zana")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/services"
                className="text-sm text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
              >
                {t("explore_services")}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <FeaturePill
                icon={<Zap className="h-3.5 w-3.5" />}
                label={t("capability_streaming")}
              />
              <FeaturePill
                icon={<Mic className="h-3.5 w-3.5" />}
                label={t("capability_voice")}
              />
              <FeaturePill
                icon={<Languages className="h-3.5 w-3.5" />}
                label={t("capability_multilang")}
              />
              <FeaturePill
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                label={t("capability_grounded")}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Persona cards */}
      <section className="container py-14 relative">
        <span
          className="ek-deco-blob teal absolute -top-10 left-1/4 h-48 w-48"
          aria-hidden="true"
        />
        <h2 className="ek-page-title text-2xl mb-6">{t("why_zana")}</h2>
        <div className="grid gap-5 md:grid-cols-3 relative z-10">
          <PersonaCard
            href="/chat"
            theme="ek-persona-citizen"
            icon={<User className="h-6 w-6" />}
            color="bg-yellow-100 text-yellow-700"
            title={t("persona_citizen")}
            desc={t("persona_citizen_desc")}
            cta={t("ask_zana")}
          />
          <PersonaCard
            href="/agent/login"
            theme="ek-persona-agent"
            icon={<Radio className="h-6 w-6" />}
            color="bg-blue-100 text-blue-700"
            title={t("persona_agent")}
            desc={t("persona_agent_desc")}
            cta={t("enter")}
          />
          <PersonaCard
            href="/admin/login"
            theme="ek-persona-admin"
            icon={<LayoutDashboard className="h-6 w-6" />}
            color="bg-blue-50 text-blue-600"
            title={t("persona_admin")}
            desc={t("persona_admin_desc")}
            cta={t("enter")}
          />
        </div>
      </section>

      {/* Live service shortcuts */}
      <section className="container py-14 space-y-6 relative">
        <span
          className="ek-deco-blob amber absolute -top-12 right-1/4 h-44 w-44"
          aria-hidden="true"
        />
        <div className="flex items-center justify-between relative z-10">
          <h2 className="ek-page-title text-2xl">{t("popular_services")}</h2>
          <Link
            href="/services"
            className="text-sm ek-text-secondary hover:underline"
          >
            {t("services")} →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 relative z-10">
          {loadingServices &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="ek-skeleton h-40 rounded-2xl" />
            ))}
          {!loadingServices &&
            services.slice(0, 8).map((s) => {
              const Icon = ICONS[s.service_id] ?? FileText;
              return (
                <Link
                  key={s.id}
                  href={`/services/${s.service_id}`}
                  className="ek-tile-premium flex flex-col items-center text-center gap-3 no-underline"
                >
                  <span className="inline-flex h-12 w-12 rounded-full bg-brand-light items-center justify-center ek-text-brand">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="font-bold ek-text-secondary text-sm">
                    {s.name || s.service_id}
                  </span>
                  {s.category && (
                    <span className="text-[10px] ek-text-muted uppercase tracking-wider">
                      {s.category}
                    </span>
                  )}
                </Link>
              );
            })}
        </div>
      </section>

      {/* Stats strip */}
      <section className="container py-14 relative">
        <span
          className="ek-deco-blob indigo absolute top-0 -right-10 h-44 w-44"
          aria-hidden="true"
        />
        <h2 className="ek-page-title text-2xl mb-6 relative z-10">
          {t("by_the_numbers")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          <Stat
            icon={<Sparkles className="h-5 w-5" />}
            value={totalServices || "—"}
            label={t("services")}
          />
          <Stat
            icon={<Languages className="h-5 w-5" />}
            value="3"
            label={t("stats_languages")}
          />
          <Stat
            icon={<Mic className="h-5 w-5" />}
            value="Whisper"
            label={t("voice_input")}
          />
          <Stat
            icon={<ShieldCheck className="h-5 w-5" />}
            value="RAG"
            label={t("citations")}
          />
        </div>
      </section>

      {/* Highlight categories carousel */}
      <section className="container py-12 space-y-5">
        <h2 className="ek-page-title text-2xl">{t("explore_services")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <CategoryTile
            classes="ek-tile-red"
            icon={<FileText className="h-7 w-7" />}
            count={`${services.filter((s) => /Dokumente/i.test(s.category)).length}+`}
            label={t("tile_documents")}
          />
          <CategoryTile
            classes="ek-tile-orange"
            icon={<Briefcase className="h-7 w-7" />}
            count="ARBK"
            label={t("tile_business")}
          />
          <CategoryTile
            classes="ek-tile-teal"
            icon={<Car className="h-7 w-7" />}
            count="MUP"
            label={t("tile_traffic")}
          />
          <CategoryTile
            classes="ek-tile-crimson"
            icon={<HeartPulse className="h-7 w-7" />}
            count="MShMS"
            label={t("tile_health")}
          />
          <CategoryTile
            classes="ek-tile-green"
            icon={<Baby className="h-7 w-7" />}
            count={`${services.filter((s) => /Civile|Familjare/i.test(s.category)).length}+`}
            label={t("tile_family")}
          />
          <CategoryTile
            classes="ek-tile-pink"
            icon={<Users className="h-7 w-7" />}
            count="MFA"
            label={t("tile_residency")}
          />
        </div>
      </section>
    </div>
  );
}

function FeaturePill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm">
      <span className="text-blue-600">{icon}</span>
      {label}
    </span>
  );
}

function PersonaCard({
  href,
  theme,
  icon,
  color,
  title,
  desc,
  cta,
}: {
  href: string;
  theme: string;
  icon: React.ReactNode;
  color: string;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <Link href={href} className={`ek-persona ${theme} flex flex-col gap-4`}>
      <span className="persona-badge" aria-hidden="true" />
      <span
        className={`inline-flex h-12 w-12 rounded-full items-center justify-center ${color} relative z-10`}
      >
        {icon}
      </span>
      <div className="relative z-10">
        <p className="font-bold ek-text-brand text-xl">{title}</p>
        <p className="text-sm ek-text-muted mt-2 leading-relaxed">{desc}</p>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-bold ek-text-secondary mt-auto relative z-10">
        {cta}
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="ek-stat-premium flex items-center gap-3">
      <span className="inline-flex h-11 w-11 rounded-full bg-white shadow-sm items-center justify-center ek-text-brand">
        {icon}
      </span>
      <div>
        <p className="text-2xl font-bold ek-text-brand leading-none tracking-tight">
          {value}
        </p>
        <p className="text-xs ek-text-muted mt-1">{label}</p>
      </div>
    </div>
  );
}

function CategoryTile({
  classes,
  icon,
  count,
  label,
}: {
  classes: string;
  icon: React.ReactNode;
  count: string;
  label: string;
}) {
  return (
    <div className={`ek-tile ${classes}`}>
      <span className="tile-icon">{icon}</span>
      <span className="tile-count">{count}</span>
      <span className="tile-meta">{label}</span>
    </div>
  );
}
