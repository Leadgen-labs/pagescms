import { translateUiText } from "@/lib/ui-translations";
import type { Language } from "@/lib/language";
const authCodes: Record<string,string> = {
 INVALID_OTP:"Invalid OTP code", OTP_EXPIRED:"OTP expired", TOO_MANY_ATTEMPTS:"Too many attempts", USER_NOT_FOUND:"User not found", INVALID_EMAIL:"Invalid email", EMAIL_NOT_VERIFIED:"Email is not verified", SESSION_EXPIRED:"Session expired",
};
export function errorText(message: string, language: Language) {
  const source = authCodes[message] ?? message;
  const translated = translateUiText(source,language);
  if (translated !== source) return translated;
  const lines = source.split("\n").map(line=>translateUiText(line,language)).join("\n");
  if (lines !== source) return lines;
  // Third-party diagnostics are not authored UI copy. Show localized recovery
  // instructions rather than leaking an untranslated provider response.
  if (language === "cs" && /[áčďéěíňóřšťúůýž]/i.test(source)) return source;
  if (language === "en" && !/[áčďéěíňóřšťúůýž]/i.test(source)) return source;
  return language === "cs" ? "Požadavek se nepodařilo dokončit. Zkuste to znovu, případně kontaktujte správce." : "Could not complete the request. Please try again or contact your administrator.";
}
