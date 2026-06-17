import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AppShell } from "@/components/AppShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ZANA — Platforma eKosova",
  description: "Asistente AI për shërbimet publike të Kosovës (eKosova).",
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sq" className={inter.variable}>
      <body className={inter.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
