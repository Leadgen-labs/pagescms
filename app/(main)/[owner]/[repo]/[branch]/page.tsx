"use client";

import { UiText } from "@/components/ui-text";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";
import { hasGithubIdentity } from "@/lib/authz-shared";
import { isConfigEnabled } from "@/lib/config";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Page() {
  const { config } = useConfig();
  const { user } = useUser();
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    // Weby agentury (obsahová repa webs-obsah-*) začínají přehledem: co je hotové a návod.
    if (config?.repo.startsWith("webs-obsah-")) {
      router.replace(`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/prehled`);
    } else if (config?.object.content?.[0]) {
      router.replace(`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/${config.object.content[0].type}/${config.object.content[0].name}`);
    } else if (config?.object.media) {
      router.replace(`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/media/${config.object.media[0].name}`);
    } else if (hasGithubIdentity(user) && isConfigEnabled(config?.object)) {
      router.replace(`/${config?.owner}/${config?.repo}/${encodeURIComponent(config!.branch)}/configuration`);
    } else {
      setError(true);
    }
  }, [config, router, user]);

  return error
    ? (
      hasGithubIdentity(user)
        ? <Empty className="absolute inset-0 border-0 rounded-none">
            <EmptyHeader>
              <EmptyTitle><UiText text={"Configuration unavailable"} /></EmptyTitle>
              <EmptyDescription><UiText text={"This repository is not configured, and configuration access is disabled here. Edit \".pages.yml\" on GitHub if you think this is a mistake."}/></EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                className={buttonVariants({ variant: "default" })}
                href={`https://github.com/${config?.owner}/${config?.repo}/edit/${encodeURIComponent(config!.branch)}/.pages.yml`}
              >
                <UiText text={"Edit configuration on GitHub"} /> </Link>
            </EmptyContent>
          </Empty>
        : <Empty className="absolute inset-0 border-0 rounded-none">
            <EmptyHeader>
              <EmptyTitle><UiText text={"Repository not configured"} /></EmptyTitle>
              <EmptyDescription><UiText text={"This repository does not have a \".pages.yml\" file yet. Ask a GitHub admin to initialize the configuration first."} /></EmptyDescription>
            </EmptyHeader>
          </Empty>
    )
    : null;
}
