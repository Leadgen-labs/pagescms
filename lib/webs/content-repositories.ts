export const CONTENT_REPO_OWNERS = ["Leadgen-labs-cz", "Leadgen-labs"] as const;
export const CONTENT_REPO_PREFIX = "webs-obsah-";

export function isContentRepoOwner(owner: string) {
  return CONTENT_REPO_OWNERS.some((value) => value.toLowerCase() === owner.toLowerCase());
}

export function isContentRepoName(repo: string) {
  return /^webs-obsah-[a-z0-9][a-z0-9-]*$/i.test(repo);
}
