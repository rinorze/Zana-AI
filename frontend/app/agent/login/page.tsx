"use client";

import { AuthCard } from "@/components/AuthCard";
import { useT } from "@/lib/i18n";

export default function AgentLoginPage() {
  const t = useT();
  return (
    <AuthCard
      title={t("agent_dashboard")}
      subtitle={t("login_subtitle")}
      expectedRole="agent"
      redirectTo="/agent"
    />
  );
}
