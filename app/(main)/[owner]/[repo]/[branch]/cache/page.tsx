"use client";

import { UiText } from "@/components/ui-text";
import { CachePage } from "@/components/cache/cache-page";
import { DocumentTitle, formatRepoBranchTitle } from "@/components/document-title";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";
import { hasGithubIdentity } from "@/lib/authz-shared";
import { isCacheEnabled } from "@/lib/config";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export default function Page() {
  const { config } = useConfig();
  const { user } = useUser();

  if (!config) throw new Error("Configuration not found.");

  if (!hasGithubIdentity(user)) {
    return (
      <Empty className="absolute inset-0 border-0 rounded-none">
        <EmptyHeader>
          <EmptyTitle><UiText text={"Access denied"} /></EmptyTitle>
          <EmptyDescription><UiText text={"Only GitHub users can manage the cache."} /></EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!isCacheEnabled(config.object)) {
    return (
      <Empty className="absolute inset-0 border-0 rounded-none">
        <EmptyHeader>
          <EmptyTitle><UiText text={"Cache disabled"} /></EmptyTitle>
          <EmptyDescription><UiText text={"Enable the cache in \".pages.yml\" by setting \"settings.cache: true\"."}/></EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <DocumentTitle
        title={formatRepoBranchTitle("Cache", config.owner, config.repo, config.branch)}
      />
      <CachePage owner={config.owner} repo={config.repo} branch={config.branch} />
    </>
  );
}
