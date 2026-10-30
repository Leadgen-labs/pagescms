"use client";
import Link from "next/link";
import { Check, ChevronsUpDown, LayoutDashboard } from "lucide-react";
import { useRepo } from "@/contexts/repo-context";
import { useConfig } from "@/contexts/config-context";
import { useWebsites } from "@/hooks/use-websites";
import { websiteHref } from "@/lib/websites";
import { projectName } from "@/lib/project-name";
import { useUi } from "@/components/use-ui";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function WebsiteSwitcher() {
  const ui = useUi();
  const { owner, repo } = useRepo();
  const { config } = useConfig();
  const { data, isLoading } = useWebsites();
  const { setOpenMobile } = useSidebar();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" aria-label={ui("Switch website")}>
          <LayoutDashboard className="size-8 shrink-0 rounded-md bg-sidebar-accent p-1.5" />
          <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{projectName(repo, config?.object)}</span>
            <span className="text-xs text-muted-foreground">{ui("Switch website")}</span>
          </span>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{ui("Your websites")}</DropdownMenuLabel>
        <div className="max-h-72 overflow-y-auto">
          {isLoading && <p className="px-2 py-2 text-sm text-muted-foreground">{ui("Loading websites…")}</p>}
          {data?.websites.map((website) => {
            const current = website.owner.toLowerCase() === owner.toLowerCase() && website.repo.toLowerCase() === repo.toLowerCase();
            return <DropdownMenuItem asChild key={website.owner + "/" + website.repo}><Link href={websiteHref(website)} onClick={() => setOpenMobile(false)} aria-current={current ? "page" : undefined}><span className="flex-1 truncate">{website.displayName || projectName(website.repo)}</span>{current && <Check className="size-4" />}</Link></DropdownMenuItem>;
          })}
          {data?.failedAccounts ? <p role="status" className="px-2 py-2 text-sm text-muted-foreground">{ui("Some websites could not be loaded. Open the overview to retry.")}</p> : null}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/" onClick={() => setOpenMobile(false)}><LayoutDashboard className="size-4" />{ui("All websites")}</Link></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
