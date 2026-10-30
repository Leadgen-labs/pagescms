export type Language = "cs" | "en";
export const isLanguage = (value: unknown): value is Language => value === "cs" || value === "en";
export const defaultLanguage: Language = "cs";
export const emailSubject = (kind: "login" | "invite" | "added", language: Language, value: string) => {
  if (kind === "login") return language === "cs" ? `Váš přihlašovací kód do administrace: ${value}` : `Your Pages CMS temporary code is ${value}`;
  if (kind === "invite") return language === "cs" ? `Pozvánka ke správě webu „${value}“` : `Join "${value}" on Pages CMS`;
  return language === "cs" ? `Máte přístup ke správě webu „${value}“` : `You were added to "${value}" on Pages CMS`;
};
