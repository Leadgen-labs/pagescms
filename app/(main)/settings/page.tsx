import { ui } from "@/lib/ui-source";
import { UiText } from "@/components/ui-text";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { MainRootLayout } from "../main-root-layout";
import { Appearance } from "@/components/settings/appearance";
import { SignOut } from "@/components/settings/sign-out";
import { Profile } from "@/components/settings/profile";
import { DocumentTitle } from "@/components/document-title";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("User not found");
  return (
    <MainRootLayout>
      <DocumentTitle title={ui("Account settings")} />
      <div className="mx-auto max-w-screen-sm space-y-6 p-4 md:p-6">
        <Link className={buttonVariants({variant:"outline",size:"xs"})} href="/"><ArrowLeft /><UiText text="All websites" /></Link>
        <header className="space-y-2">
          <h1 className="text-lg font-semibold tracking-tight md:text-2xl"><UiText text="Account settings" /></h1>
          <p className="text-sm text-muted-foreground"><UiText text="Your signed-in account and administration preferences." /></p>
        </header>
        <Profile email={session.user.email} />
        <Appearance />
        <SignOut />
      </div>
    </MainRootLayout>
  );
}
