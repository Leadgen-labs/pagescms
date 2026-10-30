"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useUi } from "@/components/use-ui";
import { Button } from "@/components/ui/button";

export function SignOut() {
  const ui = useUi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <section className="space-y-2 border-t pt-6">
    <Button variant="outline" disabled={busy} onClick={async () => {
      setBusy(true);setError(false);
      try {
        const result = await signOut();
        if (result.error) throw new Error("Sign out failed");
        window.location.assign("/sign-in");
      } catch { setError(true);setBusy(false); }
    }}><LogOut className="size-4" />{ui(busy ? "Signing out…" : "Sign out")}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{ui("Could not sign out. Please try again.")}</p>}
  </section>;
}
