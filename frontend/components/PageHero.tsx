"use client";

import { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export interface PageHeroProps {
  /** Eyebrow chip above the title (typically the section name or "ZANA · …"). */
  eyebrow?: ReactNode;
  /** The big page title — rendered with a gradient brand text. */
  title: ReactNode;
  /** Optional second line of the title rendered in solid brand blue. */
  titleLine2?: ReactNode;
  /** Short paragraph below the title. */
  subtitle?: ReactNode;
  /** Optional right-aligned content (search bar, action button, illustration). */
  actions?: ReactNode;
  /** Breadcrumbs node placed above the eyebrow. */
  breadcrumbs?: ReactNode;
}

export function PageHero({ eyebrow, title, titleLine2, subtitle, actions, breadcrumbs }: PageHeroProps) {
  return (
    <section className="bg-gradient-to-br from-blue-50/60 via-white to-yellow-50/30 border-b border-gray-100">
      <div className="container py-10 md:py-14 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-3">
          {breadcrumbs}
          {eyebrow !== undefined && (
            <span className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-bold text-black shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              {eyebrow}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-black">
            {title}
            {titleLine2 && (
              <>
                <br />
                <span className="text-blue-600">{titleLine2}</span>
              </>
            )}
          </h1>
          {subtitle && <p className="text-gray-500 text-base max-w-2xl leading-relaxed">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </section>
  );
}
