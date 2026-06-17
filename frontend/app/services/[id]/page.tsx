"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, ExternalLink, FileText, MapPin, MessageSquare } from "lucide-react";

import { PageHero } from "@/components/PageHero";
import { GuidedWizard } from "@/components/citizen/GuidedWizard";
import { StepWalker } from "@/components/citizen/StepWalker";
import { getService, type ServiceDetail } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { pickLocalized } from "@/lib/utils";

export default function ServiceDetailPage() {
  const params = useParams<{ id: string }>();
  const language = useStore((s) => s.language);
  const t = useT();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    getService(params.id)
      .then(setService)
      .catch((err) => setError(String(err)));
  }, [params?.id]);

  if (error) return <div className="container py-8 text-ek-danger">{error}</div>;
  if (!service) return <div className="container py-8 ek-text-muted">Loading…</div>;

  const name = pickLocalized(service.names, language) || service.service_id;
  const description = pickLocalized(service.description, language);

  return (
    <div>
      <PageHero
        breadcrumbs={
          <nav className="ek-breadcrumbs" aria-label="Breadcrumbs">
            <Link href="/">{t("home")}</Link>
            <ChevronRight className="h-3 w-3 sep" />
            <Link href="/services">{t("services")}</Link>
            {service.category && (
              <>
                <ChevronRight className="h-3 w-3 sep" />
                <span>{service.category}</span>
              </>
            )}
          </nav>
        }
        eyebrow={service.category || t("services")}
        title={name}
        subtitle={description}
        actions={
          <Link
            href={`/chat?q=${encodeURIComponent(name)}&service=${encodeURIComponent(service.service_id)}`}
            className="ek-cta-primary inline-flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {t("ask_zana")}
          </Link>
        }
      />

      <div className="container py-10 space-y-8">

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon="💶" value={service.fee} label={t("fee")} />
        <Stat icon="⏱️" value={service.duration} label={t("duration")} />
        <Stat icon="🏢" value={service.office} label={t("office")} />
        <Stat icon="📋" value={`${service.required_documents.length}`} label={t("documents_required")} />
      </section>

      {service.required_documents.length > 0 && !wizardOpen && (
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="ek-cta-primary text-sm"
        >
          🧭 Më ndihmo hap pas hapi
        </button>
      )}

      {wizardOpen && (
        <GuidedWizard service={service} onClose={() => setWizardOpen(false)} />
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {service.required_documents.length > 0 && (
            <Card title={t("detail_documents")}>
              <ul className="list-disc pl-5 space-y-1 ek-text">
                {service.required_documents.map((doc, i) => (
                  <li key={i}>{doc}</li>
                ))}
              </ul>
            </Card>
          )}

          {service.steps.length > 0 && (
            <section className="space-y-3">
              <h2 className="ek-page-title text-xl">{t("detail_steps")}</h2>
              <StepWalker serviceId={service.service_id} steps={service.steps} />
            </section>
          )}

          {service.faqs.length > 0 && (
            <Card title={t("detail_faq")}>
              <div className="space-y-2">
                {service.faqs.map((faq) => (
                  <details key={faq.id} className="rounded-md border ek-border p-3 bg-white">
                    <summary className="cursor-pointer font-bold ek-text-brand">
                      {pickLocalized(faq.questions, language)}
                    </summary>
                    <p className="text-sm ek-text-muted pt-2 whitespace-pre-line">
                      {pickLocalized(faq.answers, language)}
                    </p>
                  </details>
                ))}
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          {service.office_locations.length > 0 && (
            <Card title={t("detail_offices")}>
              <ul className="space-y-3 text-sm">
                {service.office_locations.map((loc, i) => (
                  <li key={i} className="flex gap-2">
                    <MapPin className="h-4 w-4 ek-text-secondary mt-0.5" />
                    <div>
                      <strong className="ek-text-brand">{loc.city}</strong>
                      {loc.address && <div>{loc.address}</div>}
                      {loc.hours && <div className="ek-text-muted text-xs">{loc.hours}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {service.source_urls.length > 0 && (
            <Card title={t("detail_sources")}>
              <ul className="space-y-1 text-sm break-all">
                {service.source_urls.map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="ek-text-secondary inline-flex items-center gap-1 hover:underline">
                      {url}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {service.last_verified && (
            <div className="text-xs ek-text-muted inline-flex items-center gap-1">
              <FileText className="h-3 w-3" /> Verifikuar: {service.last_verified}
            </div>
          )}
        </aside>
      </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="ek-stat-premium flex flex-col items-start gap-1">
      <span className="text-2xl">{icon}</span>
      <span className="font-bold ek-text-brand leading-tight">{value || "—"}</span>
      <span className="text-xs ek-text-muted">{label}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ek-glass-card p-6 space-y-3">
      <h2 className="ek-page-title text-lg">{title}</h2>
      {children}
    </section>
  );
}
