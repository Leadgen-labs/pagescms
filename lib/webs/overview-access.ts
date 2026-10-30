import "server-only";
import { db } from "@/db";
import { collaboratorMatchesUserForRepo } from "@/lib/collaborator-access";
import { createOctokitInstance } from "@/lib/utils/octokit";
import type { User } from "@/types/user";

/** Called only after getToken verified this user's access to this exact repository. */
export async function canReadSiteOverview(
  user: User,
  owner: string,
  repo: string,
  access: { token: string; source: "user" | "installation" },
): Promise<boolean> {
  // An installation token is returned only for an explicitly invited collaborator.
  if (access.source === "installation") return true;
  const collaborator = await db.query.collaboratorTable.findFirst({
    where: collaboratorMatchesUserForRepo(user, owner, repo),
  });
  if (collaborator) return true;
  try {
    const { data } = await createOctokitInstance(access.token).rest.repos.get({ owner, repo });
    // Merely being able to read a public GitHub repository is insufficient.
    return data.private === true || data.permissions?.push === true;
  } catch {
    return false;
  }
}
