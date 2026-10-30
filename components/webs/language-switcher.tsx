"use client";
import { useLanguage } from "@/contexts/language-context";

export function LanguageSwitcher() {
  const { language, setLanguage, saving, error, t } = useLanguage();
  return <div className="space-y-1"><div role="group" aria-label="Jazyk rozhraní / Interface language" className="inline-flex rounded-lg border bg-background p-1 text-xs">
    {([ ["cs", "CZ", "Čeština"], ["en", "EN", "English"] ] as const).map(([value, label, title]) =>
      <button key={value} type="button" lang={value} title={title} aria-pressed={language === value}
        disabled={saving} onClick={() => void setLanguage(value)} className={`min-h-8 rounded-md px-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 ${language === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{label}</button>
    )}
  </div>{error && <p role="alert" className="max-w-52 text-xs text-destructive">{t("Jazyk se nepodařilo uložit. Zkuste to znovu.", "Could not save the language. Please try again.")}</p>}</div>;
}
