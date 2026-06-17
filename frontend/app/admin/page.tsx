"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, FileSpreadsheet, FileText, FlaskConical, FolderTree, Globe } from "lucide-react";

import { useT } from "@/lib/i18n";

const TILES = [
  { href: "/admin/services", icon: FolderTree, titleKey: "admin_tile_services", subtitleKey: "admin_tile_services_desc" },
  { href: "/admin/templates", icon: FileSpreadsheet, titleKey: "admin_tile_templates", subtitleKey: "admin_tile_templates_desc" },
  { href: "/admin/documents", icon: FileText, titleKey: "admin_tile_documents", subtitleKey: "admin_tile_documents_desc" },
  { href: "/admin/sources", icon: Globe, titleKey: "admin_tile_sources", subtitleKey: "admin_tile_sources_desc" },
  { href: "/admin/analytics", icon: BarChart3, titleKey: "admin_tile_analytics", subtitleKey: "admin_tile_analytics_desc" },
  { href: "/admin/playground", icon: FlaskConical, titleKey: "admin_tile_playground", subtitleKey: "admin_tile_playground_desc" },
];

export default function AdminHomePage() {
  const t = useT();
  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 relative overflow-hidden">
        <span className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-blue-100 blur-[60px] opacity-40" aria-hidden="true" />
        <span className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-yellow-100 blur-[60px] opacity-40" aria-hidden="true" />
        <h1 className="text-3xl font-bold leading-tight text-black relative z-10">{t("admin_panel")}</h1>
        <p className="text-gray-500 text-sm mt-3 max-w-xl relative z-10">{t("admin_intro")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 group no-underline hover:border-blue-400 hover:shadow-md transition-all"
            >
              <span className="inline-flex h-12 w-12 rounded-xl bg-blue-50 items-center justify-center text-blue-600">
                <Icon className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <p className="font-bold text-black">{t(tile.titleKey as any)}</p>
                <p className="text-sm text-gray-500">{t(tile.subtitleKey as any)}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
