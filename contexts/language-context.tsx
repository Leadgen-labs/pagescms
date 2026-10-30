"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { defaultLanguage, type Language } from "@/lib/language";
export type { Language } from "@/lib/language";
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => Promise<void>; saving: boolean; error: boolean }>({ language: defaultLanguage, setLanguage: async () => {}, saving: false, error: false });
export function LanguageProvider({ children, initialLanguage, persistToAccount = false }: { children: React.ReactNode; initialLanguage?: Language; persistToAccount?: boolean }) {
  const [language, setLanguage] = useState<Language>(initialLanguage ?? defaultLanguage);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (initialLanguage) { setLanguage(initialLanguage); return; }
    try { const saved = localStorage.getItem("webs-cms-language"); if (saved === "cs" || saved === "en") setLanguage(saved); } catch { /* Storage can be disabled. */ }
  }, [initialLanguage]);
  useEffect(() => {
    if (persistToAccount || !document.querySelector('[data-account-language]')) document.documentElement.lang = language;
  }, [language, persistToAccount]);
  const select = useCallback(async (next: Language) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setError(false); setSaving(true);
    try {
      if (persistToAccount) {
        const res = await fetch('/api/preferences/language', {method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({language:next})});
        if (!res.ok) throw Error('save_failed');
      }
      setLanguage(next);
      try { localStorage.setItem("webs-cms-language", next); } catch { /* In-memory selection still works. */ }
    } catch { setError(true); }
    finally { savingRef.current = false; setSaving(false); }
  }, [persistToAccount]);
  const content = <LanguageContext.Provider value={{ language, setLanguage: select, saving, error }}>{children}</LanguageContext.Provider>;
  return persistToAccount ? <div className="contents" lang={language} data-account-language>{content}</div> : content;
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  const t = useCallback((cs: string, en: string) => context.language === "cs" ? cs : en, [context.language]);
  return { ...context, t };
}
