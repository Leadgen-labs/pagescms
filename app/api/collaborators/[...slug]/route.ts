import { type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { collaboratorTable, languagePreferenceTable } from "@/db/schema";
import { requireGithubRepoWriteAccess } from "@/lib/authz-server";
import { createHttpError, toErrorResponse } from "@/lib/api-error";
import { requireApiUserSession } from "@/lib/session-server";

/**
 * Fetches collaborators for a repository.
 *
 * GET /api/collaborators/[owner]/[repo]
 *
 * Requires authentication. Only accessible to GitHub users (not collaborators).
 */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  try {
    const params = await context.params;
    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;

    // TODO: support for branches and account collaborators
    if (!params.slug || params.slug.length !== 2) {
      throw createHttpError("Invalid slug: owner and repo are mandatory", 400);
    }

    const owner = params.slug[0];
		const repo = params.slug[1];

    const { repoAccess } = await requireGithubRepoWriteAccess(
      sessionResult.user,
      owner,
      repo,
      "Only GitHub users can manage collaborators.",
    );

    const collaborators = await db.query.collaboratorTable.findMany({
      where: and(
        eq(collaboratorTable.ownerId, repoAccess.ownerId),
        eq(collaboratorTable.repoId, repoAccess.repoId)
      )
    });

    const preferences = collaborators.length ? await db.select().from(languagePreferenceTable).where(inArray(languagePreferenceTable.email, collaborators.map(c => c.email.toLowerCase()))) : [];
    const languages = new Map(preferences.map(p => [p.email, p.language]));
    return Response.json({
      status: "success",
      data: collaborators.map(c => ({...c, language: languages.get(c.email.toLowerCase()) ?? "cs"})),
    });
  } catch (error: any) {
    console.error(error);
    return toErrorResponse(error);
  }
};
