"use client";
import { useState } from "react";
import { Check, Copy, FilePenLine, MessageCircle, PlugZap, Inbox, ChartNoAxesCombined, LifeBuoy } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { Button } from "@/components/ui/button";

const MCP_URL = "https://mcp.mobilut.com/mcp";
export function ManagementGuide() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(MCP_URL); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  }
  const cards = [
    { icon: FilePenLine, title: t("Texty, fotky a články", "Text, photos and articles"), body: t("V levém menu otevřete stránku, článek nebo nastavení, upravte obsah a uložte ho.", "Open a page, article or settings in the left menu, edit the content and save."), timing: t("Články přibližně do minuty · stránky za 3 až 5 minut", "Articles in about a minute · pages in 3 to 5 minutes") },
    { icon: MessageCircle, title: t("Nové stránky a změny vzhledu", "New pages and design changes"), body: t("Klikněte na Napsat botovi vpravo dole, nebo napište přes WhatsApp či e-mail. Popište změnu, například: Přidejte stránku s ceníkem.", "Click Message the bot in the bottom right, or use WhatsApp or email. Describe the change, for example: Add a pricing page."), timing: t("Zadání → náhled → vaše potvrzení → nasazení", "Request → preview → your approval → deploy") },
  ];
  return <article className="space-y-5" aria-labelledby="manage-title">
    <div><h2 id="manage-title" className="text-xl font-semibold">{t("Jak web spravovat", "How to manage your website")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("Vyberte si způsob podle toho, co chcete změnit.", "Choose a way to work based on what you want to change.")}</p></div>
    <div className="grid gap-4 md:grid-cols-2">{cards.map(({ icon: Icon, title, body, timing }) => <section key={title} className="rounded-xl border bg-card p-5">
      <Icon aria-hidden className="mb-4 size-6 text-primary"/><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p><p className="mt-4 border-t pt-3 text-xs font-medium">{timing}</p>
    </section>)}</div>
    <section className="overflow-hidden rounded-xl border-2 border-primary/50 bg-primary/5 p-5 md:p-6" aria-labelledby="mcp-title">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-primary p-3 text-primary-foreground"><PlugZap aria-hidden className="size-6"/></span><div><span className="text-xs font-bold uppercase tracking-wider text-primary">{t("MCP konektor", "MCP connector")}</span><h3 id="mcp-title" className="mt-1 text-lg font-semibold">{t("Spravujte web ze svého AI chatu", "Manage your website from your AI chat")}</h3></div></div>
      <p className="mt-4 text-sm leading-relaxed">{t("Propojte Claude nebo ChatGPT s webem. Pak můžete zadávat úpravy a pracovat s články přímo v chatu, který už používáte. Dostupnost konektorů závisí na vaší AI aplikaci a tarifu.", "Connect Claude or ChatGPT to your website. Request changes and work on articles directly in the chat you already use. Connector availability depends on your AI app and plan.")}</p>
      <ol className="mt-5 grid gap-3 md:grid-cols-3">{[
        t("V AI aplikaci otevřete nastavení konektorů a přidejte vlastní MCP server.", "Open connector settings in your AI app and add a custom MCP server."),
        t("Vložte adresu níže a přihlaste se účtem, který má přístup k webu.", "Paste the address below and sign in with an account that has access to your website."),
        t("Napište například: Ukaž mi moje weby. Pak zadejte požadovanou úpravu.", "Try: Show me my websites. Then describe the change you need."),
      ].map((step, i) => <li key={i} className="flex gap-3 rounded-lg border border-primary/15 bg-background/70 p-3 text-sm"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span><span>{step}</span></li>)}</ol>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3"><code className="w-full min-w-0 select-all break-all text-sm sm:w-auto sm:flex-1">{MCP_URL}</code><Button type="button" variant="outline" size="sm" onClick={() => void copy()}>{copied ? <Check aria-hidden className="size-4"/> : <Copy aria-hidden className="size-4"/>}{copied ? t("Zkopírováno", "Copied") : t("Kopírovat adresu", "Copy address")}</Button></div>
      <p role="status" className="mt-2 text-xs text-muted-foreground">{copyError ? t("Adresu se nepodařilo zkopírovat. Označte ji a zkopírujte ručně.", "Could not copy the address. Select it and copy it manually.") : copied ? t("Adresa je ve schránce.", "Address copied to clipboard.") : t("Zveřejnění změn vždy vyžaduje vaše potvrzení.", "Publishing changes always requires your approval.")}</p>
    </section>
    <div className="grid gap-4 md:grid-cols-3">{[
      { icon: Inbox, title: t("Poptávky", "Enquiries"), body: t("Chodí na nastavené e-maily nebo k partnerovi. Stav doručení najdete v sekci Formuláře a poptávky.", "Enquiries go to the configured email addresses or partner. Check delivery in Forms and enquiries.") },
      { icon: ChartNoAxesCombined, title: t("Návštěvnost", "Traffic"), body: t("Měření se spouští se souhlasem z cookie lišty. Pro přístup do Google Analytics nám pošlete e-mail svého Google účtu.", "Analytics runs with cookie consent. Send us your Google account email to request access to Google Analytics.") },
      { icon: LifeBuoy, title: t("Potřebujete pomoc?", "Need help?"), body: t("Napište botovi, co nefunguje. Dotaz předá našemu týmu. O nedoručených poptávkách dostáváme upozornění i my.", "Tell the bot what is wrong. It will pass the issue to our team. We also receive alerts about undelivered enquiries.") },
    ].map(({ icon: Icon, title, body }) => <section key={title} className="rounded-xl border p-4"><Icon aria-hidden className="mb-3 size-5 text-muted-foreground"/><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p></section>)}</div>
  </article>;
}
