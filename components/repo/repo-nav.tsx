"use client";

import { ui, useUi } from "@/components/use-ui";
import { useMemo } from "react";
import Link from "next/link";
import { internalProjectPath, publicProjectPath } from "@/lib/project-url";
import { usePathname } from "next/navigation";
import { useConfig } from "@/contexts/config-context";
import { useUser } from "@/contexts/user-context";
import { hasGithubIdentity } from "@/lib/authz-shared";
import { isConfigEnabled } from "@/lib/config";
import { cn } from "@/lib/utils";
import { FileStack, FileText, FolderOpen, Settings, Users } from "lucide-react";

const RepoNavItem = ({
  children,
  href,
  icon,
  active,
  onClick
}: {
  children: React.ReactNode;
  href: string;
  icon: React.ReactNode;
  active: boolean;
  onClick?: () => void;
}) => (
  <Link
    className={cn(
      active ? "bg-accent" : "hover:bg-accent",
      "flex items-center rounded-lg px-3 py-2 font-medium focus:bg-accent outline-none"
    )}
    href={publicProjectPath(href)}
    onClick={onClick}
  >
    {icon}
    <span className="truncate">{children}</span>
  </Link>
);

const RepoNav = ({
  onClick
}: {
  onClick?: () => void;
}) => {
  const ui = useUi();
  const { config } = useConfig();
  const { user } = useUser();
  const pathname = internalProjectPath(usePathname());

  const items = useMemo(() => {
    if (!config || !config.object) return [];
    const configObject: any = config.object;
    const contentItems = configObject.content?.map((item: any) => ({
      key: item.name,
      icon: item.type === "collection"
        ? <FileStack className="h-5 w-5 mr-2" />
        : <FileText className="h-5 w-5 mr-2" />
      ,
      href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/${item.type}/${encodeURIComponent(item.name)}`,
      label: item.label || item.name,
    })) || [];

    const mediaItems = configObject.media?.map((item: any) => ({
      key: item.name || "media",
      icon: <FolderOpen className="h-5 w-5 mr-2" />,
      href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/media/${item.name}`,
      label: item.label || item.name || "Media"
    })) || [];

    const canManageRepo = hasGithubIdentity(user);

    const settingsItem = canManageRepo && isConfigEnabled(configObject)
      ? {
        key: "configuration",
        icon: <Settings className="h-5 w-5 mr-2" />,
        href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/configuration`,
        label: ui("Configuration")
      }
      : null;

    const collaboratorsItem = configObject && Object.keys(configObject).length !== 0 && canManageRepo
      ? {
        key: "collaborators",
        icon: <Users className="h-5 w-5 mr-2" />,
        href: `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collaborators`,
        label: ui("Uživatelé a přístupy")
      }
      : null;

    return [
      ...contentItems,
      ...mediaItems,
      settingsItem,
      collaboratorsItem
    ].filter(Boolean);
  }, [config, user, ui]);

  if (!items.length) return null;

  return (
    <>
      {items.map(item => (
        <RepoNavItem
          key={item.key}
          icon={item.icon}
          href={publicProjectPath(item.href)}
          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          onClick={onClick}
        >
          {item.label}
        </RepoNavItem>
      ))}
    </>
  );
}

export { RepoNav };
