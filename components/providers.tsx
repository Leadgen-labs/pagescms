"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { ActionToastProvider } from "@/contexts/action-toast-context";
import { UserProvider } from "@/contexts/user-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { User } from "@/types/user";
import { LanguageProvider } from "@/contexts/language-context";

export function Providers({ children, user }: { children: React.ReactNode, user: User | null }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <UserProvider user={user}>
        <TooltipProvider>
          <ActionToastProvider>
            <LanguageProvider>{children}</LanguageProvider>
          </ActionToastProvider>
        </TooltipProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
