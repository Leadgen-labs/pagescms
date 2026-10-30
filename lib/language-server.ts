import "server-only";
import { db } from "@/db";
import { languagePreferenceTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { defaultLanguage, isLanguage, type Language } from "@/lib/language";

const emailKey = (email: string) => email.trim().toLowerCase();
export async function getPreferredLanguage(email: string): Promise<Language> {
  const preference = await db.query.languagePreferenceTable.findFirst({ where: eq(languagePreferenceTable.email, emailKey(email)) });
  return isLanguage(preference?.language) ? preference.language : defaultLanguage;
}
export async function setPreferredLanguage(email: string, language: Language) {
  if (!isLanguage(language)) throw new Error("Unsupported language");
  await db.insert(languagePreferenceTable).values({ email: emailKey(email), language })
    .onConflictDoUpdate({ target: languagePreferenceTable.email, set: { language, updatedAt: new Date() } });
}
export async function initializePreferredLanguage(email: string, language: Language): Promise<Language> {
  if (!isLanguage(language)) throw new Error("Unsupported language");
  await db.insert(languagePreferenceTable).values({ email: emailKey(email), language }).onConflictDoNothing();
  return getPreferredLanguage(email);
}
