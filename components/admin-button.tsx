"use client";

import { useUi } from "@/components/use-ui";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { useUser } from "@/contexts/user-context";
import { Button } from "@/components/ui/button";

export function AdminButton() {
  const ui = useUi();
  const { user } = useUser();

  if (!user?.isAdmin) return null;

  return (
    <Button asChild variant="outline" size="sm" className="shrink-0 px-2 text-xs sm:px-3 sm:text-sm">
      <Link href="/admin/weby">
        <LayoutDashboard className="size-4" />
        {ui("Superadmin")}
      </Link>
    </Button>
  );
}
