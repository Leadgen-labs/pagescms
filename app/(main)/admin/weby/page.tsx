import { MainRootLayout } from "../../main-root-layout";
import { requireAdminSession } from "@/lib/admin";
import { callWebsBot } from "@/lib/webs/bot";
import { DocumentTitle } from "@/components/document-title";
import { SuperadminDashboard } from "@/components/webs/superadmin-dashboard";
import type { SiteAlert, SiteOverviewData } from "@/components/webs/site-checklist";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user } = await requireAdminSession();
  let sites: SiteOverviewData[] = [];
  let alerts: SiteAlert[] = [];
  let checkedForSeconds = 0;
  let error = "";
  try {
    const result = await callWebsBot<{sites?:SiteOverviewData[];alerts?:SiteAlert[];checkedForSeconds?:number;error?:string}>("/cms/overview",{op:"all",email:user.email,admin:true});
    if(result.status!==200)throw Error(result.data.error??`Bot vrátil ${result.status}.`);
    if(!Array.isArray(result.data.sites))throw Error("Invalid website overview response.");
    sites=result.data.sites;
    alerts=Array.isArray(result.data.alerts)?result.data.alerts:[];
    checkedForSeconds=result.data.checkedForSeconds??0;
  } catch(cause) { error=cause instanceof Error?cause.message:String(cause); }
  return <MainRootLayout><DocumentTitle title="Superadmin overview"/><SuperadminDashboard sites={sites} alerts={alerts} checkedForSeconds={checkedForSeconds} error={error}/></MainRootLayout>;
}
