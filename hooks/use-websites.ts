"use client";
import useSWR from "swr";
import { useUser } from "@/contexts/user-context";
import { loadAccessibleWebsites, websiteAccounts } from "@/lib/websites";

export function useWebsites() {
  const { user } = useUser();
  const accounts = websiteAccounts(user?.accounts);
  const key = user ? ["websites", user.id, JSON.stringify(accounts)] : null;
  return useSWR(key, () => loadAccessibleWebsites(accounts), { revalidateOnFocus: true, dedupingInterval: 15000 });
}
