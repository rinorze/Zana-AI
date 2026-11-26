"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ZanaLogo } from "@/components/ZanaLogo";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{
  href: string;
  key: "home" | "services" | "ask_zana" | "agent_dashboard" | "admin_panel";
}> = [
  { href: "/", key: "home" },
  { href: "/services", key: "services" },
  { href: "/chat", key: "ask_zana" },
  { href: "/agent", key: "agent_dashboard" },
  { href: "/admin", key: "admin_panel" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname() ?? "/";
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu after navigating.
  useEffect(() => setMenuOpen(false), [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header>
        <div className="ek-top-bar">
          <div className="ek-top-bar-inner">
            <div className="ml-auto flex items-center gap-3 shrink-0">
              <span className="hidden sm:inline font-bold">
                {t("language")}:
              </span>
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        <div className="ek-header">
          <div className="ek-header-inner">
            <Link
              href="/"
              aria-label="ZANA"
              className="flex items-center gap-3 shrink-0 mr-auto"
            >
              <ZanaLogo height={56} className="h-12 md:h-14 w-auto" />
              <span className="hidden lg:inline text-[11px] ek-text-muted uppercase tracking-[0.18em] border-l ek-border pl-3">
                eKosova AI
              </span>
            </Link>
            <nav aria-label="Main navigation" className="ek-nav">
              {NAV_ITEMS.map(({ href, key }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(isActive(href) && "active")}
                >
                  {t(key)}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                className="ek-menu-button"
                aria-label={t("menu")}
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
        {menuOpen && (
          <nav id="mobile-nav" aria-label={t("menu")} className="ek-mobile-nav">
            {NAV_ITEMS.map(({ href, key }) => (
              <Link
                key={href}
                href={href}
                className={cn(isActive(href) && "active")}
              >
                {t(key)}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Decorative blobs sit partly off-screen; clip them so phones get no sideways scroll. */}
      <main className="flex-1 overflow-x-clip">{children}</main>

      <footer className="ek-footer">
        <div className="container py-10">
          <div className="ek-footer-grid">
            <div className="space-y-3">
              <ZanaLogo height={48} className="h-12 w-auto" />
              <p className="ek-text-muted text-xs leading-relaxed">
                {t("footer_blurb")}
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-bold ek-text-brand">{t("about_portal")}</p>
              <a
                href="https://github.com/rinorze/Zana-AI"
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                {t("source_code")}
              </a>
              <a
                href="https://ekosova.rks-gov.net"
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                {t("official_portal")}
              </a>
            </div>
            <div className="space-y-2">
              <p className="font-bold ek-text-brand">{t("demo_logins")}</p>
              <Link href="/agent/login" className="block">
                {t("agent_dashboard")}
              </Link>
              <Link href="/admin/login" className="block">
                {t("admin_panel")}
              </Link>
            </div>
            <div className="space-y-2">
              <p className="font-bold ek-text-brand">{t("official_contacts")}</p>
              <a href="tel:03820030900" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" /> 038 200 30 900
              </a>
              <a href="tel:080030900" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" /> 0800 30 900
              </a>
            </div>
          </div>
        </div>
        <div className="border-t ek-border">
          <div className="container py-3 flex flex-col md:flex-row items-center justify-between gap-2 text-xs ek-text-muted">
            <span>© {new Date().getFullYear()} Rinor Zeqiri · ZANA</span>
            <span>{t("powered_by")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
