"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { MessageSquare, Phone } from "lucide-react";

import { AccessibilityPanel } from "@/components/AccessibilityPanel";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ZanaLogo } from "@/components/ZanaLogo";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
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

const TOP_LINKS: Array<{ href: string; key: "help" | "faq" | "links" }> = [
  { href: "https://ekosova.rks-gov.net/Home/Help", key: "help" },
  { href: "https://ekosova.rks-gov.net/Home/FAQ", key: "faq" },
  { href: "https://ekosova.rks-gov.net/Home/Links", key: "links" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname() ?? "/";
  const highContrast = useStore((s) => s.highContrast);
  const fontScale = useStore((s) => s.fontScale);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("high-contrast", highContrast);
    root.style.fontSize = `${Math.round(fontScale * 16)}px`;
  }, [highContrast, fontScale]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header>
        {/* Yellow eKosova top bar */}
        <div className="ek-top-bar">
          <div className="ek-top-bar-inner">
            <nav aria-label="Quick links" className="flex items-center">
              {TOP_LINKS.map((l) => (
                <a key={l.key} href={l.href} target="_blank" rel="noreferrer">
                  {t(l.key)}
                </a>
              ))}
              <a href="mailto:support@ekosova.rks-gov.net">Webmail</a>
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden sm:inline font-bold">
                {t("language")}:
              </span>
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* White menu row */}
        <div className="ek-header">
          <div className="ek-header-inner">
            <Link
              href="/"
              aria-label="ZANA — eKosova"
              className="flex items-center gap-3"
            >
              <ZanaLogo height={56} className="h-14 w-auto" />
              <span className="hidden md:inline text-[11px] ek-text-muted uppercase tracking-[0.18em] border-l ek-border pl-3">
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
            <div className="flex items-center gap-2">
              <AccessibilityPanel />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="ek-footer">
        <div className="container py-10">
          <div className="ek-footer-grid">
            <div className="space-y-3">
              <ZanaLogo height={48} className="h-12 w-auto" />
              <p className="ek-text-muted text-xs leading-relaxed">
                {t("footer_blurb")}
              </p>
              <div className="flex items-center gap-2 pt-2 text-xs font-bold">
                <a
                  href="#"
                  className="inline-flex h-7 w-7 rounded-full items-center justify-center bg-brand-light ek-text-brand"
                  aria-label="Facebook"
                >
                  f
                </a>
                <a
                  href="#"
                  className="inline-flex h-7 w-7 rounded-full items-center justify-center bg-brand-light ek-text-brand"
                  aria-label="X / Twitter"
                >
                  𝕏
                </a>
                <a
                  href="#"
                  className="inline-flex h-7 w-7 rounded-full items-center justify-center bg-brand-light ek-text-brand"
                  aria-label="Instagram"
                >
                  ◎
                </a>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-bold ek-text-brand">{t("about_portal")}</p>
              <a
                href="https://ekosova.rks-gov.net/Home/Privacy"
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                {t("privacy_policy")}
              </a>
              <Link href="/admin/login" className="block">
                {t("admin_panel")}
              </Link>
              <Link href="/agent/login" className="block">
                {t("agent_dashboard")}
              </Link>
            </div>
            <div className="space-y-2">
              <p className="font-bold ek-text-brand">{t("apps")}</p>
              <a
                href="https://play.google.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-block"
              >
                <span className="inline-flex items-center gap-2 rounded-md bg-black text-white px-3 py-1.5 text-xs">
                  ▶ Google Play
                </span>
              </a>
              <a
                href="https://www.apple.com/app-store/"
                target="_blank"
                rel="noreferrer"
                className="inline-block"
              >
                <span className="inline-flex items-center gap-2 rounded-md bg-black text-white px-3 py-1.5 text-xs">
                  {" "}
                  App Store
                </span>
              </a>
            </div>
            <div className="space-y-2">
              <p className="font-bold ek-text-brand">{t("call_center")}</p>
              <a
                href="tel:03820030900"
                className="inline-flex items-center gap-2"
              >
                <Phone className="h-3.5 w-3.5" /> 038 200 30 900
              </a>
              <a
                href="tel:080030900"
                className="inline-flex items-center gap-2"
              >
                <Phone className="h-3.5 w-3.5" /> 0800 30 900
              </a>
              <p>support@ekosova.rks-gov.net</p>
              <button className="ek-side-pill mt-2" type="button">
                <span className="icon-bubble">
                  <MessageSquare className="h-3 w-3" />
                </span>
                {t("live_chat")}
              </button>
            </div>
          </div>
        </div>
        <div className="border-t ek-border">
          <div className="container py-3 flex flex-col md:flex-row items-center justify-between gap-2 text-xs ek-text-muted">
            <span>
              © {new Date().getFullYear()} Republika e Kosovës · ZANA prototip
            </span>
            <span>{t("powered_by")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
