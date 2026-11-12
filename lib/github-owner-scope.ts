export const LEGACY_CONTENT_OWNER = "leadgen-labs";
export const ORGANIZATION_CONTENT_OWNER = "leadgen-labs-cz";
export const CONTENT_REPO_PREFIX = "webs-obsah-";

export function isCmsGithubOwner(owner: string) {
  return [LEGACY_CONTENT_OWNER, ORGANIZATION_CONTENT_OWNER].includes(owner.toLowerCase());
}

export function isCmsGithubRepository(owner: string, repo: string) {
  const login = owner.toLowerCase();
  return login === LEGACY_CONTENT_OWNER ||
    (login === ORGANIZATION_CONTENT_OWNER && /^webs-obsah-[a-z0-9][a-z0-9-]*$/i.test(repo));
}
