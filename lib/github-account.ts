import { cache } from "react";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { accountTable, collaboratorTable, userTable } from "@/db/schema";
import { createOctokitInstance } from "@/lib/utils/octokit";
import { getInstallations } from "@/lib/github-app";
import { LEGACY_CONTENT_OWNER, ORGANIZATION_CONTENT_OWNER, isCmsGithubRepository } from "@/lib/github-owner-scope";

// Read the linked GitHub OAuth account for a user.
const getGithubAccount = cache(async (userId: string) => {
  return db.query.accountTable.findFirst({
    where: and(
      eq(accountTable.userId, userId),
      eq(accountTable.providerId, "github")
    )
  });
});

const getGithubId = cache(async (userId: string): Promise<number | null> => {
  const account = await getGithubAccount(userId);
  if (!account?.accountId) return null;

  const githubId = Number(account.accountId);
  return Number.isInteger(githubId) ? githubId : null;
});

async function canSignInWithGithub(token: string, githubId: number, verifiedEmail?: string) {
  const linked = await db.query.accountTable.findFirst({
    columns: { id: true },
    where: and(eq(accountTable.providerId, "github"), eq(accountTable.accountId, String(githubId))),
  });
  if (linked) return true;

  if (verifiedEmail) {
    const collaborators = await db.query.collaboratorTable.findMany({
      columns: { owner: true, repo: true },
      where: and(
        sql`lower(${collaboratorTable.email}) = lower(${verifiedEmail})`,
        inArray(sql`lower(${collaboratorTable.owner})`, [LEGACY_CONTENT_OWNER, ORGANIZATION_CONTENT_OWNER]),
      ),
    });
    if (collaborators.some(row => isCmsGithubRepository(row.owner, row.repo))) return true;
  }

  return (await getInstallations(token)).length > 0;
}

// Refresh GitHub-derived profile fields after login without overwriting custom names.
const syncGithubProfileOnLogin = async (userId: string) => {
  const [user, githubAccount] = await Promise.all([
    db.query.userTable.findFirst({
      where: eq(userTable.id, userId),
    }),
    getGithubAccount(userId),
  ]);

  if (!user || !githubAccount?.accessToken) return;

  const octokit = createOctokitInstance(githubAccount.accessToken);
  const { data: profile } = await octokit.rest.users.getAuthenticated();

  const nextGithubUsername = profile.login ?? null;
  const nextImage = profile.avatar_url ?? null;
  const nextName = profile.name ?? profile.login ?? user.name;

  const patch: Partial<typeof userTable.$inferInsert> = {};

  if (user.githubUsername !== nextGithubUsername) {
    patch.githubUsername = nextGithubUsername;
  }

  if ((user.image ?? null) !== nextImage) {
    patch.image = nextImage;
  }

  // Preserve custom display names; only refresh names that still mirror GitHub identity.
  if (user.name.trim() === "" || user.name === user.githubUsername) {
    if (user.name !== nextName) {
      patch.name = nextName;
    }
  }

  if (Object.keys(patch).length === 0) return;

  await db
    .update(userTable)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId));
};

export { canSignInWithGithub, getGithubAccount, getGithubId, syncGithubProfileOnLogin };
