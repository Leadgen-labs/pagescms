import { getToken } from "@/lib/token";
import { createHttpError, toErrorResponse } from "@/lib/api-error";
import { requireApiUserSession } from "@/lib/session-server";
import { hasAdminAccess } from "@/lib/admin";
import { callWebsBot } from "@/lib/webs/bot";

/**
 * Stav webu pro úvodní stránku administrace (POST, bez těla). Ověří přihlášení
 * a přístup k repu, bot pak ověří, že e-mail je kontakt webu. Správce agentury
 * (ADMIN_EMAILS) vidí přehled každého webu.
 */
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ owner: string; repo: string; branch: string }> }) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) throw createHttpError("Neplatný původ požadavku.", 403);
    const session = await requireApiUserSession();
    if ("response" in session) return session.response;
    const params = await context.params;
    await getToken(session.user, params.owner, params.repo);
    if (!session.user.email) throw createHttpError("Účet nemá e-mail.", 403);
    const { status, data } = await callWebsBot("/cms/overview", {
      op: "site",
      repo: `${params.owner}/${params.repo}`,
      email: session.user.email,
      admin: hasAdminAccess(session.user),
    });
    return Response.json(data, { status, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
