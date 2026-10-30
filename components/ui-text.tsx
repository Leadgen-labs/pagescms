"use client";
import { useLanguage } from "@/contexts/language-context";
import { translateUiText } from "@/lib/ui-translations";
export function UiText({ text }: { text: string }) {
  const { language } = useLanguage();
  return <>{translateUiText(text, language)}</>;
}
