import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pickLocalized(values: Record<string, string> | undefined | null, language: string): string {
  if (!values) return "";
  return values[language] ?? values["sq"] ?? Object.values(values)[0] ?? "";
}
