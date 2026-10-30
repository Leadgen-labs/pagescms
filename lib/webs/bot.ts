import "server-only";
import { createHmac } from "node:crypto";
import { createHttpError } from "@/lib/api-error";

/**
 * Podepsaný požadavek na bota agentury webs (WEBS_BOT_URL, WEBS_BOT_SECRET =
 * CMS_CHAT_SECRET bota): x-webs-timestamp a HMAC-SHA256 "<timestamp>.<tělo>".
 * Bez nastavení vyhodí 503, volající stránka pak ukáže, že propojení chybí.
 */
export async function callWebsBot<T = any>(path: string, payload: Record<string, unknown>): Promise<{ status: number; data: T }> {
  const bot = (process.env.WEBS_BOT_URL ?? "").replace(/\/+$/, "");
  const secret = process.env.WEBS_BOT_SECRET ?? "";
  if (!bot || !secret) throw createHttpError("Propojení s botem není nastavené.", 503);
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  // The custom domain can be challenged by the zone WAF before the Worker
  // verifies our HMAC. Retry only read-only overview requests on a trusted URL.
  const fallback = process.env.WEBS_BOT_FALLBACK_URL?.replace(/\/+$/, "")
    || (bot === "https://mcp.mobilut.com" ? "https://webs-bot.crimson-bonus-69e4.workers.dev" : "");
  const urls = path === "/cms/overview" ? [...new Set([bot, fallback].filter(Boolean))] : [bot];
  for (const [index, url] of urls.entries()) {
    let res: Response;
    try {
      res = await fetch(`${url}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-webs-timestamp": timestamp, "x-webs-signature": signature },
        body,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(index < urls.length - 1 ? 8000 : 25000),
      });
    } catch {
      if (index < urls.length - 1) continue;
      throw createHttpError("Bot je dočasně nedostupný. Zkuste přehled obnovit za chvíli.", 503);
    }
    if (res.status === 401) throw createHttpError("Propojení administrace s botem se nepodařilo ověřit. Kontaktujte správce.", 502);
    const data = await res.json().catch(() => null);
    const valid = data !== null && typeof data === "object" && !Array.isArray(data);
    // An application-level denial must never be bypassed by a retry.
    if (!valid) {
      if (index < urls.length - 1) continue;
      throw createHttpError("Spojení s botem nevrátilo platnou odpověď. Zkuste přehled obnovit za chvíli.", 502);
    }
    return { status: res.status, data: data as T };
  }
  throw createHttpError("Propojení s botem není nastavené.", 503);
}
