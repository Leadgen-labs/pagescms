import { requireApiUserSession } from "@/lib/session-server";
import { createHttpError, toErrorResponse } from "@/lib/api-error";
import { isLanguage } from "@/lib/language";
import { getPreferredLanguage, setPreferredLanguage } from "@/lib/language-server";

export async function GET() {
  try {
    const session = await requireApiUserSession();
    if ("response" in session) return session.response;
    return Response.json({ language: await getPreferredLanguage(session.user.email) }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return toErrorResponse(error); }
}
export async function PATCH(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) throw createHttpError("Invalid origin", 403);
    const session = await requireApiUserSession();
    if ("response" in session) return session.response;
    const data = await request.json().catch(() => null);
    if (!isLanguage(data?.language)) throw createHttpError("Unsupported language", 400);
    await setPreferredLanguage(session.user.email, data.language);
    return Response.json({ language: data.language }, { headers: { "cache-control": "no-store" } });
  } catch (error) { return toErrorResponse(error); }
}
