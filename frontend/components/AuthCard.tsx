"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";

import { login } from "@/lib/api";
import { useT } from "@/lib/i18n";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  expectedRole?: "admin" | "agent";
  redirectTo: string;
}

export function AuthCard({ title, subtitle, expectedRole, redirectTo }: AuthCardProps) {
  const t = useT();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await login(username, password);
      if (expectedRole && result.role !== expectedRole && !(expectedRole === "agent" && result.role === "admin")) {
        throw new Error(`Kërkon role ${expectedRole}.`);
      }
      router.push(redirectTo);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-[80vh] flex items-center">
      <span className="absolute top-20 -right-20 h-72 w-72 rounded-full bg-blue-100 blur-[80px] opacity-40" aria-hidden="true" />
      <span className="absolute bottom-20 -left-20 h-72 w-72 rounded-full bg-yellow-100 blur-[80px] opacity-40" aria-hidden="true" />
      <div className="container py-16 max-w-md mx-auto relative z-10">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 space-y-6 shadow-lg">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-black">{title}</h1>
          {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="auth-u" className="text-sm font-bold text-black">{t("username")}</label>
            <input
              id="auth-u"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="ek-input"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="auth-p" className="text-sm font-bold text-black">{t("password")}</label>
            <input
              id="auth-p"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="ek-input"
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={busy} className="ek-cta-primary w-full">
            <LogIn className="h-4 w-4" />
            {busy ? "..." : t("login")}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
