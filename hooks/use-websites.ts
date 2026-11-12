"use client";
import useSWR from "swr";
import { useUser } from "@/contexts/user-context";
import { loadAccessibleWebsites, websiteAccounts } from "@/lib/websites";
import { CONTENT_REPO_OWNERS } from "@/lib/webs/content-repositories";

export function useWebsites() {
  const { user } = useUser();
  const accounts = websiteAccounts([
    ...(user?.accounts ?? []),
    ...(user?.isAdmin ? CONTENT_REPO_OWNERS.map((login) => ({ login, type: "org" })) : []),
  ]);
  const key = user ? ["websites", user.id, user.isAdmin, JSON.stringify(accounts)] : null;
  return useSWR(key, () => loadAccessibleWebsites(accounts), { revalidateOnFocus: true, dedupingInterval: 15000 });
}
