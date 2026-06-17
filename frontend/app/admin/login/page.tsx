"use client";

import { AuthCard } from "@/components/AuthCard";
import { useT } from "@/lib/i18n";

export default function AdminLoginPage() {
  const t = useT();
  return (
    <AuthCard
      title={t("admin_panel")}
      subtitle={t("login_subtitle")}
      expectedRole="admin"
      redirectTo="/admin"
    />
  );
}
