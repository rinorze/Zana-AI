import { ExternalLink } from "lucide-react";

import type { Citation } from "@/lib/stream";

export function CitationCard({ citation }: { citation: Citation }) {
  return (
    <div className="ek-card p-3 text-sm space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold ek-text-brand">
          [{citation.marker}] {citation.service_id || "—"}
        </span>
        <span className="text-xs ek-text-muted uppercase">{citation.language}</span>
      </div>
      <p className="text-xs ek-text-muted">{citation.snippet}</p>
      {citation.source_url && (
        <a
          href={citation.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs ek-text-secondary hover:underline"
        >
          {citation.source_url}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
