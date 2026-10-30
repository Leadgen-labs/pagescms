"use client";

import { DocumentTitle } from "@/components/document-title";
import { WebsiteDashboard } from "@/components/webs/website-dashboard";
import { useUi } from "@/components/use-ui";
import { MainRootLayout } from "./main-root-layout";

export default function Page() {
  const ui = useUi();
  return (
    <MainRootLayout>
      <DocumentTitle title={ui("My websites")} />
      <WebsiteDashboard />
    </MainRootLayout>
  );
}
