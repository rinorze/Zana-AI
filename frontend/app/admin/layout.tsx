"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BarChart3, FileSpreadsheet, FileText, FlaskConical, FolderTree, Globe, LogOut } from "lucide-react";

import { clearToken, getRole, getToken } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/admin/services", labelKey: "admin_tile_services", icon: FolderTree },
  { href: "/admin/templates", labelKey: "admin_tile_templates", icon: FileSpreadsheet },
  { href: "/admin/documents", labelKey: "admin_tile_documents", icon: FileText },
  { href: "/admin/sources", labelKey: "admin_tile_sources", icon: Globe },
  { href: "/admin/analytics", labelKey: "admin_tile_analytics", icon: BarChart3 },
  { href: "/admin/playground", labelKey: "admin_tile_playground", icon: FlaskConical },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  useEffect(() => {
    if (pathname.startsWith("/admin/login")) return;
    if (!getToken() || getRole() !== "admin") {
      router.replace("/admin/login");
    }
  }, [pathname, router]);

  if (pathname.startsWith("/admin/login")) return <>{children}</>;

  function logout() {
    clearToken();
    router.replace("/admin/login");
  }

  const t = useT();

  return (
    <div className="container py-8 grid gap-6 md:grid-cols-[240px_1fr]">
      <aside className="bg-white border border-gray-200 rounded-2xl p-4 space-y-1 self-start sticky top-4">
        <div className="flex items-center justify-between pb-2 px-2">
          <h2 className="text-xs font-bold text-black uppercase tracking-wide">{t("admin_panel")}</h2>
          <button onClick={logout} className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
            <LogOut className="h-3 w-3" />
            {t("logout")}
          </button>
        </div>
        <Link
          href="/admin"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors",
            pathname === "/admin"
              ? "bg-blue-50 text-blue-600"
              : "text-gray-600 hover:bg-blue-50 hover:text-blue-600",
          )}
        >
          {t("summary")}
        </Link>
        {SECTIONS.map(({ href, labelKey, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:bg-blue-50 hover:text-blue-600",
            )}
          >
            <Icon className="h-4 w-4" />
            {t(labelKey as any)}
          </Link>
        ))}
      </aside>
      <section>{children}</section>
    </div>
  );
}
