"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useUi } from "@/components/use-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function Appearance() {
  const ui = useUi();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <Card>
    <CardHeader><CardTitle>{ui("Appearance")}</CardTitle><CardDescription>{ui("The appearance preference applies to this browser.")}</CardDescription></CardHeader>
    <CardContent>
      <fieldset className="flex flex-wrap gap-3" aria-label={ui("Appearance")}>
        {([ ["light", "Light"], ["dark", "Dark"], ["system", "System"] ] as const).map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-3 text-sm"><input type="radio" name="account-theme" value={value} checked={mounted && (theme || "system") === value} disabled={!mounted} onChange={() => setTheme(value)} />{ui(label)}</label>)}
      </fieldset>
    </CardContent>
  </Card>;
}
