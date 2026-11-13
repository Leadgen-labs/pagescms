"use client";
import { useLanguage } from "@/contexts/language-context";
import { formatUi } from "@/lib/ui-translations";
export function UiText({ text, values }: { text: string; values?: unknown[] }) {
  const { language } = useLanguage();
  return <>{formatUi(text, language, values)}</>;
}
