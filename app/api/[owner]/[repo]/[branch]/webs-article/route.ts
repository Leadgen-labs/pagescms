import { createHttpError, toErrorResponse } from "@/lib/api-error";
import { hasAppOrigin } from "@/lib/base-url";
import { articleRevisionPattern, editorialArticlePath, type ArticleReceipt } from "@/lib/editorial-article";
import { requireApiUserSession } from "@/lib/session-server";
import { getToken } from "@/lib/token";
import { callWebsBot } from "@/lib/webs/bot";
import { canReadSiteOverview } from "@/lib/webs/overview-access";

export async function POST(
  request: Request,
  context: { params: Promise<{ owner: string; repo: string; branch: string }> },
) {
  try {
    if (!hasAppOrigin(request)) {
      throw createHttpError("Invalid request origin.", 403);
    }
    const session = await requireApiUserSession();
    if ("response" in session) return session.response;
    const { owner, repo, branch } = await context.params;
    const body = await request.json().catch(() => null);
    if (
      !repo.toLowerCase().startsWith("webs-obsah-") || branch !== "main"
      || typeof body?.path !== "string" || !editorialArticlePath(body.path)
      || typeof body?.revision !== "string" || !articleRevisionPattern.test(body.revision)
    ) {
      throw createHttpError("Invalid article revision.", 400);
    }
    const access = await getToken(session.user, owner, repo);
    if (!await canReadSiteOverview(session.user, owner, repo, access)) {
      throw createHttpError("No access to this article.", 403);
    }
    const { status, data } = await callWebsBot<ArticleReceipt>("/cms/article", {
      owner, repo, branch, path: body.path, revision: body.revision,
    });
    if (status !== 200) throw createHttpError("Could not check the article on the website.", status);
    return Response.json({ status: "success", data }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
