/**
 * Token helper functions.
 */

import { cache } from "react";
import { App } from "@octokit/app";
import { decrypt, encrypt } from "@/lib/crypto";
import { createOctokitInstance } from "@/lib/utils/octokit";
import { db } from "@/db";
import {
  githubInstallationTokenTable
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { User } from "@/types/user";
import { getGithubAccount } from "@/lib/github-account";
import { createHttpError } from "@/lib/api-error";
import { collaboratorMatchesUserForRepo } from "@/lib/collaborator-access";
import { hasAdminAccess } from "@/lib/admin";
import { isContentRepoName, isContentRepoOwner } from "@/lib/webs/content-repositories";

const installationTokenRefreshInFlight = new Map<number, Promise<string>>();

// Get a token for a user (including collagborators who need to provide an owner/repo scope).
const getToken = cache(async (
  user: User,
  owner: string,
  repo: string,
  verifyGithubAccess: boolean = false,
) => {
  if (hasAdminAccess(user) && isContentRepoOwner(owner) && isContentRepoName(repo)) {
    try {
      return { token: await getInstallationToken(owner, repo), source: "installation" as const };
    } catch (error) {
      if (!isGitHubNotFound(error)) throw error;
    }
  }

  const githubAccount = await getGithubAccount(user.id);
  if (githubAccount?.accessToken) {
    const hasGithubAccess = await canAccessRepoWithToken(githubAccount.accessToken, owner, repo);
    if (hasGithubAccess) return {
      token: githubAccount.accessToken,
      source: "user" as const,
    };
  }

  const permission = await db.query.collaboratorTable.findFirst({
    where: collaboratorMatchesUserForRepo(user, owner, repo),
  });
  if (permission) {
    const installationToken = await getInstallationToken(owner, repo);

    return {
      token: installationToken,
      source: "installation" as const,
    };
  }

  if (githubAccount?.accessToken && verifyGithubAccess) {
    throw createHttpError(
      `You do not have permission to access "${owner}/${repo}".`,
      403,
    );
  }

  throw createHttpError(
    `You do not have permission to access "${owner}/${repo}".`,
    403,
  );
});

const getGitHubApp = () =>
  new App({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
  });

const isGitHubNotFound = (error: unknown) =>
  typeof error === "object" && error !== null && "status" in error && error.status === 404;

// Get the GitHub App installation token for a specific repository.
const getInstallationToken = cache(async (owner: string, repo: string) => {
  const app = getGitHubApp();
  const repoInstallation = await app.octokit.request(
    "GET /repos/{owner}/{repo}/installation",
    { owner, repo },
  );
  if (!repoInstallation) throw new Error(`Installation token not found for "${owner}/${repo}".`);

  return getTokenForInstallation(app, repoInstallation.data.id);
});

const listAdminContentRepos = cache(async (user: User, owner: string) => {
  if (!hasAdminAccess(user) || !isContentRepoOwner(owner)) return [];

  const app = getGitHubApp();
  try {
    const { data: installation } = await app.octokit.request("GET /orgs/{org}/installation", { org: owner })
      .catch((error: unknown) => {
        if (!isGitHubNotFound(error)) throw error;
        return app.octokit.request("GET /users/{username}/installation", { username: owner });
      });
    const octokit = createOctokitInstance(await getTokenForInstallation(app, installation.id));
    return await octokit.paginate(
      "GET /installation/repositories",
      { per_page: 100 },
      ({ data }) => data.filter((repo) => repo.owner.login.toLowerCase() === owner.toLowerCase() && isContentRepoName(repo.name))
        .map((repo) => ({
          owner: repo.owner.login,
          repo: repo.name,
          private: repo.private,
          defaultBranch: repo.default_branch,
          updatedAt: repo.updated_at,
        })),
    );
  } catch (error) {
    if (isGitHubNotFound(error)) return [];
    throw error;
  }
});

async function getTokenForInstallation(app: App, installationId: number) {
  const tokenData = await db.query.githubInstallationTokenTable.findFirst({
    where: eq(githubInstallationTokenTable.installationId, installationId)
  });

  if (tokenData && Date.now() < tokenData.expiresAt.getTime() - 60_000) {
    const token = await decrypt(tokenData.ciphertext, tokenData.iv);
    if (!token) throw new Error(`Token could not be retrieved and/or decrypted.`);
    return token;
  }

  const existingRefresh = installationTokenRefreshInFlight.get(installationId);
  if (existingRefresh) {
    return existingRefresh;
  }

  const refreshJob = (async () => {
    const installationToken = await app.octokit.request(
      "POST /app/installations/{installation_id}/access_tokens",
      {
        installation_id: installationId,
      },
    );

    const { ciphertext, iv } = await encrypt(installationToken.data.token);
    const expiresAt = new Date(installationToken.data.expires_at);

    if (tokenData) {
      await db.update(githubInstallationTokenTable).set({
        ciphertext,
        iv,
        expiresAt
      }).where(
        eq(githubInstallationTokenTable.id, tokenData.id)
      );
    } else {
      await db.insert(githubInstallationTokenTable).values({
        ciphertext,
        iv,
        installationId,
        expiresAt
      }).onConflictDoUpdate({
        target: githubInstallationTokenTable.installationId,
        set: {
          ciphertext,
          iv,
          expiresAt,
        },
      });
    }

    return installationToken.data.token;
  })();

  installationTokenRefreshInFlight.set(installationId, refreshJob);
  try {
    return await refreshJob;
  } finally {
    installationTokenRefreshInFlight.delete(installationId);
  }
}

// Get the GitHub user token.
const getUserToken = cache(async (userId: string) => {
  const githubAccount = await getGithubAccount(userId);
  if (!githubAccount?.accessToken) throw new Error(`GitHub token not found for user ${userId}.`);

  return githubAccount.accessToken;
});

const canAccessRepoWithToken = async (
  token: string,
  owner: string,
  repo: string,
) => {
  try {
    const octokit = createOctokitInstance(token);
    await octokit.rest.repos.get({ owner, repo });
    return true;
  } catch {
    return false;
  }
};

export { getInstallationToken, getUserToken, getToken, listAdminContentRepos };
