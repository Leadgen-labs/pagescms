"use client";

import Link from "next/link";
import { useUser } from "@/contexts/user-context";
import { useUi } from "@/components/use-ui";
import { accountLabel } from "@/lib/account-label";
import { getInitialsFromName } from "@/lib/utils/avatar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function User({ className, onClick, showLabel = false }: {
  className?: string;
  onClick?: () => void;
  showLabel?: boolean;
}) {
  const { user } = useUser();
  const ui = useUi();
  if (!user) return null;
  const label = accountLabel(user);
  return (
    <Button asChild variant="ghost" size={showLabel ? "default" : "icon-sm"} className={cn(showLabel ? "h-auto min-w-0 flex-1 justify-start gap-2 px-2 py-2" : "rounded-full", className)}>
      <Link href="/settings" onClick={onClick} aria-label={ui("Account settings")} title={ui("Account settings")}>
        <Avatar className="size-7 shrink-0">
          <AvatarImage src={user.image || (user.githubUsername ? `https://github.com/${user.githubUsername}.png` : undefined)} alt={label} />
          <AvatarFallback>{getInitialsFromName(label)}</AvatarFallback>
        </Avatar>
        {showLabel && <span className="grid min-w-0 text-left leading-tight"><span className="truncate text-sm font-medium">{ui("Account settings")}</span><span className="truncate text-xs text-muted-foreground">{label}</span></span>}
      </Link>
    </Button>
  );
}
