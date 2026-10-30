"use client";
import { useLanguage } from "@/contexts/language-context";
import { errorText } from "@/lib/ui-error";
export function ErrorText({ text }: { text: string }) {
  const { language } = useLanguage();
  return <>{errorText(text,language)}</>;
}
