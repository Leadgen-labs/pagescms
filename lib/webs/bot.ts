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
  const res = await fetch(`${bot}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-webs-timestamp": timestamp, "x-webs-signature": signature },
    body,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(25000),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}
