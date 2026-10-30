"use client";
import { useUi } from "@/components/use-ui";
import { LanguageSwitcher } from "@/components/webs/language-switcher";
import { useLanguage } from "@/contexts/language-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function Profile({ email }: { email: string }) {
  const ui = useUi();
  const { t } = useLanguage();
  return <>
    <Card>
      <CardHeader><CardTitle>{ui("Signed-in account")}</CardTitle><CardDescription>{ui("This is the email of the currently signed-in account. It cannot be changed here.")}</CardDescription></CardHeader>
      <CardContent><p className="break-all font-medium">{email}</p></CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{t("Jazyk administrace a e-mailů", "Administration and email language")}</CardTitle>
        <CardDescription>{t("Volba se ukládá k vašemu účtu a platí i při příštím přihlášení a na dalších zařízeních.", "Your preference is saved to your account and applies on your next sign-in and on other devices.")}</CardDescription>
      </CardHeader>
      <CardContent><LanguageSwitcher /></CardContent>
    </Card>
  </>;
}
