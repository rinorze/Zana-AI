"use client";

import Link from "next/link";
import { Building2, ExternalLink, MapPin, Phone, Printer } from "lucide-react";

import type { StructuredProcedure } from "@/lib/stream";

export const CALL_CENTRE = "+38338200030900";

interface QuickActionsProps {
  structured: StructuredProcedure;
}

/**
 * Action chips rendered below the structured procedure block.
 *
 * All actions degrade gracefully: missing source URL → eKosova homepage,
 * missing office name → search for the service name on Google Maps,
 * print works even without the PDF feature being wired up.
 */
export function QuickActions({ structured }: QuickActionsProps) {
  const primarySource = structured.source_urls?.[0] || "https://ekosova.rks-gov.net/";
  const mapsQuery = structured.office
    ? `${structured.office} ${structured.name} Kosovë`
    : `${structured.name} Kosovë`;
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(mapsQuery)}`;

  function onPrint() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
      <Link
        href={`/services/${encodeURIComponent(structured.service_id)}`}
        className="ek-tile-action"
      >
        <Building2 className="h-3.5 w-3.5" />
        <span>Hap shërbimin</span>
      </Link>
      <a
        href={primarySource}
        target="_blank"
        rel="noopener noreferrer"
        className="ek-tile-action"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        <span>Hap eKosova</span>
      </a>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="ek-tile-action"
      >
        <MapPin className="h-3.5 w-3.5" />
        <span>Gjej zyrën</span>
      </a>
      <a href={`tel:${CALL_CENTRE}`} className="ek-tile-action">
        <Phone className="h-3.5 w-3.5" />
        <span>Telefono 038 200 30 900</span>
      </a>
      <button type="button" onClick={onPrint} className="ek-tile-action">
        <Printer className="h-3.5 w-3.5" />
        <span>Ruaj / Printo</span>
      </button>
    </div>
  );
}
