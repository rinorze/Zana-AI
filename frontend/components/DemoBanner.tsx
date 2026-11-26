"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Info } from "lucide-react";

import { isDemoSession } from "@/lib/api";
import { useT } from "@/lib/i18n";

/** Says that this is a read-only demo session, with a link to log in. */
export function DemoBanner({ loginHref }: { loginHref: string }) {
  const t = useT();
  const [demo, setDemo] = useState(false);
  useEffect(() => setDemo(isDemoSession()), []);
  if (!demo) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
    >
      <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t("demo_mode_notice")}</span>
      <Link href={loginHref} className="font-bold underline">
        {t("demo_mode_login")}
      </Link>
    </div>
  );
}
