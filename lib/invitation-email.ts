export type InvitationLocale = "cs" | "en";

export function invitationLocale(value: unknown): InvitationLocale {
  return value === "en" ? "en" : "cs";
}

export function invitationSubject(baseUrl: string, siteName: string, locale: InvitationLocale) {
  const host = new URL(baseUrl).host;
  return locale === "en"
    ? `Your access to ${host} – manage ${siteName}`
    : `Váš přístup do ${host} – správa webu ${siteName}`;
}
