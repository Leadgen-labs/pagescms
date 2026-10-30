"use client";

import { useState } from "react";
import { useUser } from "@/contexts/user-context";
import { RepoSelect } from "@/components/repo/repo-select";
import { RepoTemplates } from "@/components/repo/repo-templates";
import { DocumentTitle } from "@/components/document-title";
import { WebsiteDashboard } from "@/components/webs/website-dashboard";
import { hasGithubIdentity } from "@/lib/authz-shared";
import { useUi } from "@/components/use-ui";
import { MainRootLayout } from "./main-root-layout";

export default function Page() {
  const ui = useUi();
  const { user } = useUser();
  const [defaultAccount, setDefaultAccount] = useState<any>(null);
  return (
    <MainRootLayout>
      <DocumentTitle title={ui("All websites")} />
      <WebsiteDashboard />
      {hasGithubIdentity(user) && user?.accounts?.length ? (
        <details className="mx-auto mb-8 max-w-5xl px-4 md:px-6">
          <summary className="cursor-pointer text-sm text-muted-foreground">{ui("Other GitHub projects")}</summary>
          <div className="mt-4 space-y-6 rounded-lg border p-4">
            <RepoSelect onAccountSelect={setDefaultAccount} />
            <RepoTemplates defaultAccount={defaultAccount} />
          </div>
        </details>
      ) : null}
    </MainRootLayout>
  );
}
