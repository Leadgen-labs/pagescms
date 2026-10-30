import { ui } from "@/lib/ui-source";
import { UiText } from "@/components/ui-text";
import Link from "next/link";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accountTable } from "@/db/schema";
import { MainRootLayout } from "../main-root-layout";
import { Installations } from "@/components/settings/installations";
import { Identities } from "@/components/settings/identities";
import { Appearance } from "@/components/settings/appearance";
import { SignOut } from "@/components/settings/sign-out";
import { Profile } from "@/components/settings/profile";
import { DocumentTitle } from "@/components/document-title";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const user = session?.user;
  if (!user) throw new Error("User not found");
  const githubAccount = await db.query.accountTable.findFirst({
    where: and(
      eq(accountTable.userId, user.id),
      eq(accountTable.providerId, "github"),
    ),
  });
  const githubConnected = Boolean(githubAccount);
  const githubManageUrl = process.env.GITHUB_APP_CLIENT_ID
    ? `https://github.com/settings/connections/applications/${process.env.GITHUB_APP_CLIENT_ID}`
    : null;

  return (
    <MainRootLayout>
      <DocumentTitle title={ui("Account settings")} />
      <div className="max-w-screen-sm mx-auto p-4 md:p-6 space-y-6">
        <Link
          className={cn(
            buttonVariants({ variant: "outline", size: "xs" }),
            "inline-flex",
          )}
          href="/"
        >
          <ArrowLeft />
          <UiText text={"All websites"} /> </Link>
        <header className="space-y-2 mb-6">
          <h1 className="font-semibold tracking-tight text-lg md:text-2xl">
            <UiText text={"Account settings"} /> </h1>
          <p className="text-sm text-muted-foreground"><UiText text="Your name, sign-in email and personal preferences." /></p>
        </header>
        <div className="flex flex-col relative flex-1 space-y-6">
          <Profile
            name={user.name}
            email={user.email}
            githubUsername={user.githubUsername}
          />

          <Appearance />
          {githubConnected && (
            <details className="space-y-4 rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-medium"><UiText text="Advanced: GitHub connection" /></summary>
              <Card>
                <CardHeader><CardTitle><UiText text="Authentication" /></CardTitle><CardDescription><UiText text="Your sign-in methods and linked identity providers." /></CardDescription></CardHeader>
                <CardContent><Identities email={user.email} githubConnected={githubConnected} githubUsername={user.githubUsername} githubManageUrl={githubManageUrl} /></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle><UiText text="Installations" /></CardTitle><CardDescription><UiText text="Manage the accounts the Github application is installed on." /></CardDescription></CardHeader>
                <CardContent><Installations /></CardContent>
              </Card>
            </details>
          )}
          <SignOut />
        </div>
      </div>
    </MainRootLayout>
  );
}
