import { createHmac } from "crypto";
import { getToken } from "@/lib/token";
import { createHttpError, toErrorResponse } from "@/lib/api-error";
import { requireApiUserSession } from "@/lib/session-server";

/**
 * Chat s botem agentury webs (úprava instance). Ověří přihlášení a přístup
 * k repu a požadavek podepíše pro bota (WEBS_BOT_URL, WEBS_BOT_SECRET =
 * CMS_CHAT_SECRET bota). Bez nich je chat vypnutý (404).
 *
 * POST /api/[owner]/[repo]/[branch]/webs-bot
 *   { op: "poll" } | { op: "send", text } | { op: "action", action, value }
 *
 * Requires authentication.
 */

export async function POST(
  request: Request,
  context: { params: Promise<{ owner: string, repo: string, branch: string }> }
) {
  try {
    const botUrl = (process.env.WEBS_BOT_URL ?? "").replace(/\/+$/, "");
    const secret = process.env.WEBS_BOT_SECRET ?? "";
    if (!botUrl || !secret) throw createHttpError("Chat s botem není zapnutý.", 404);

    const params = await context.params;
    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;
    const user = sessionResult.user;

    const { token } = await getToken(user, params.owner, params.repo);
    if (!token) throw createHttpError("Token not found", 401);
    if (!user.email) throw createHttpError("Účet nemá e-mail.", 403);

    const data: any = await request.json().catch(() => ({}));
    if (!["poll", "send", "action"].includes(data?.op)) throw createHttpError(`"op" must be "poll", "send" or "action".`, 400);

    const body = JSON.stringify({
      repo: `${params.owner}/${params.repo}`,
      email: user.email,
      op: data.op,
      ...(typeof data.text === "string" ? { text: data.text.slice(0, 8000) } : {}),
      ...(typeof data.action === "string" ? { action: data.action } : {}),
      ...(typeof data.value === "string" ? { value: data.value } : {}),
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

    const res = await fetch(`${botUrl}/cms/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-webs-timestamp": timestamp, "x-webs-signature": signature },
      body,
      signal: AbortSignal.timeout(25000),
    });
    const json: any = await res.json().catch(() => null);
    if (!res.ok) throw createHttpError(json?.error || "Bot teď neodpovídá, zkuste to prosím za chvíli.", res.status === 401 ? 502 : res.status);

    return Response.json({ status: "success", data: json });
  } catch (error: any) {
    console.error(error);
    return toErrorResponse(error);
  }
}
