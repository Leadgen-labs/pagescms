"use client";

import { useLanguage } from "@/contexts/language-context";
import { translateUiText } from "@/lib/ui-translations";
import { useEffect } from "react";

const APP_TITLE = "Pages CMS";

export const formatDocumentTitle = (title?: string | null) =>
  title ? `${title} | ${APP_TITLE}` : APP_TITLE;

export const formatRepoBranchTitle = (
  title: string,
  owner: string,
  repo: string,
  branch?: string,
) => {
  const repoRef = `${owner}/${repo}${branch ? `@${branch}` : ""}`;
  return `${title} | ${repoRef}`;
};

export function DocumentTitle({
  title,
}: {
  title?: string | null;
}) {
  const { language } = useLanguage();
  useEffect(() => {
    document.title = formatDocumentTitle(title?.split(" | ").map(part => translateUiText(part, language)).join(" | "));
  }, [title, language]);

  return null;
}
