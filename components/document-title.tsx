"use client";

import { useLanguage } from "@/contexts/language-context";
import { translateUiText } from "@/lib/ui-translations";
import { useEffect } from "react";
import { useOptionalConfig } from "@/contexts/config-context";
import { projectName } from "@/lib/project-name";

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
  const config = useOptionalConfig()?.config;
  const displayTitle = config?.repo.startsWith("webs-obsah-") && title
    ? title.replace(`${config.owner}/${config.repo}@${config.branch}`, projectName(config.repo, config.object))
    : title;
  useEffect(() => {
    document.title = formatDocumentTitle(displayTitle?.split(" | ").map(part => translateUiText(part, language)).join(" | "));
  }, [displayTitle, language]);

  return null;
}
