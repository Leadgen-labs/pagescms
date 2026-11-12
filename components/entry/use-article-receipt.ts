"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { requireApiSuccess } from "@/lib/api-client";
import type { ArticleReceipt } from "@/lib/editorial-article";
import type { ApiSuccess } from "@/types/api";

const SYNC_CHECK_WINDOW = 60_000;

export function useArticleReceipt(url: string | null, path?: string, revision?: string) {
  const startedAt = useRef(0);
  const [attempt, setAttempt] = useState(0);
  const [expired, setExpired] = useState(false);
  const key = url && path && revision ? [url, path, revision] as const : null;
  const { data, error, isValidating, mutate } = useSWR(key, async ([url, path, revision]) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, revision }),
    });
    return (await requireApiSuccess<ApiSuccess<ArticleReceipt>>(response, "Could not check publication status.")).data;
  }, {
    dedupingInterval: 2_000,
    errorRetryCount: 1,
    refreshInterval: (receipt) => {
      if (receipt?.state === "scheduled" && receipt.publishedAt) {
        return Math.max(5_000, Math.min(30 * 60_000, Date.parse(receipt.publishedAt) - Date.now() + 1_000));
      }
      return receipt?.state === "pending" && Date.now() - startedAt.current < SYNC_CHECK_WINDOW ? 5_000 : 0;
    },
  });

  useEffect(() => {
    if (!url || !path || !revision) return;
    startedAt.current = Date.now();
    setExpired(false);
    const timer = window.setTimeout(() => setExpired(true), SYNC_CHECK_WINDOW);
    return () => window.clearTimeout(timer);
  }, [attempt, path, revision, url]);

  return {
    receipt: data,
    failed: Boolean(error) || expired && (!data || data.state === "pending"),
    checking: isValidating,
    retry: () => {
      setAttempt((value) => value + 1);
      void mutate().catch(() => {});
    },
  };
}
