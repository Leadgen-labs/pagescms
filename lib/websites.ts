import { publicProjectPath } from "@/lib/project-url";

export type Website = { owner: string; repo: string; displayName?: string; defaultBranch?: string };
export type WebsiteAccount = { login: string; type?: string; repositorySelection?: string };

export function websiteAccounts(accounts: WebsiteAccount[] = []) {
  const unique = new Map<string, WebsiteAccount>();
  for (const account of accounts) {
    if (!account.login) continue;
    const key = account.login.toLowerCase();
    const previous = unique.get(key);
    if (!previous || account.repositorySelection === "all") unique.set(key, account);
  }
  return [...unique.values()].sort((a, b) => a.login.localeCompare(b.login));
}

export function websiteHref(website: Website) {
  return publicProjectPath(`/${website.owner}/${website.repo}/${encodeURIComponent(website.defaultBranch || "main")}/prehled`);
}

export async function loadAccessibleWebsites(accounts: WebsiteAccount[], request: typeof fetch = fetch) {
  const results = await Promise.allSettled(websiteAccounts(accounts).map(async (account) => {
    const query = new URLSearchParams({ websites_only: "1", type: account.type || "org", repository_selection: account.repositorySelection || "selected" });
    const response = await request(`/api/repos/${encodeURIComponent(account.login)}?${query}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Website list: HTTP " + response.status);
    const payload = await response.json();
    if (payload.status !== "success" || !Array.isArray(payload.data)) throw new Error("Invalid website list");
    return payload.data as Website[];
  }));
  const unique = new Map<string, Website>();
  for (const result of results) if (result.status === "fulfilled") for (const website of result.value) {
    if (typeof website.owner !== "string" || typeof website.repo !== "string" || !website.repo.startsWith("webs-obsah-")) continue;
    unique.set(website.owner.toLowerCase() + "/" + website.repo.toLowerCase(), website);
  }
  return { websites: [...unique.values()].sort((a, b) => (a.displayName || a.repo).localeCompare(b.displayName || b.repo, "cs")), failedAccounts: results.filter((result) => result.status === "rejected").length };
}
