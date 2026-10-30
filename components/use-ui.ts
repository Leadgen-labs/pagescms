"use client";
import { useCallback } from "react";
import { useLanguage } from "@/contexts/language-context";
import { formatUi } from "@/lib/ui-translations";
export function ui(source: string, ...values: unknown[]) {
  const language = typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "cs";
  return formatUi(source,language,values);
}
export function useUi() {
  const { language } = useLanguage();
  return useCallback((source: string, ...values: unknown[]) => formatUi(source,language,values),[language]);
}
