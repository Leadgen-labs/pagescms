"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Check, CircleAlert, Clock3, Eye, FileText, Globe2, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditComponent as ArticleRichText } from "@/fields/core/rich-text/edit-component";
import { Thumbnail } from "@/components/thumbnail";
import { useLanguage } from "@/contexts/language-context";
import { pragueDateTime, type ArticleReceipt } from "@/lib/editorial-article";
import { cn } from "@/lib/utils";
import type { Field } from "@/types/field";

export type ArticleAction = { kind: "draft" } | { kind: "withdraw" } | { kind: "publish"; date?: string };

export function ArticleStatus({
  receipt, revision, configuredStatus, changed, busy, failed, checking, onRetry,
}: {
  receipt?: ArticleReceipt;
  revision?: string;
  configuredStatus: unknown;
  changed: boolean;
  busy: boolean;
  failed: boolean;
  checking: boolean;
  onRetry: () => void;
}) {
  const { t, language } = useLanguage();
  const waiting = Boolean(revision && !failed && (!receipt || receipt.state === "pending"));
  const live = receipt?.state === "live";
  const scheduled = receipt?.state === "scheduled";
  const label = live ? t("Zveřejněno", "Published")
    : scheduled ? t("Naplánováno", "Scheduled")
    : failed ? t("Stav webu se nepodařilo ověřit", "Website status could not be verified")
    : receipt?.state === "archived" ? t("Archivováno", "Archived")
    : waiting ? t("Čeká na synchronizaci", "Waiting for sync")
    : configuredStatus === "published" && receipt?.state !== "draft"
      ? t("Uloženo v CMS", "Saved in CMS")
      : t("Koncept", "Draft");
  const Icon = live ? Check : failed ? CircleAlert : scheduled || waiting ? Clock3 : FileText;
  const date = receipt?.publishedAt && new Date(receipt.publishedAt);
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat(language === "cs" ? "cs-CZ" : "en-GB", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Prague",
    }).format(date) : null;
  const link = live ? receipt.publicUrl : receipt?.previewUrl;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div role="status" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-medium ring-1 ring-border",
          live && "bg-primary/10 text-primary ring-primary/20",
          (waiting || scheduled) && "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-900",
          failed && !live && !scheduled && "bg-destructive/10 text-destructive ring-destructive/20",
        )}>
          <Icon aria-hidden="true" className="size-3.5 shrink-0" />{label}
        </span>
        {busy ? <span className="text-muted-foreground">{t("Ukládá se…", "Saving…")}</span>
          : changed ? <span className="text-muted-foreground">{t("Máte neuložené změny.", "You have unsaved changes.")}</span>
          : scheduled && dateLabel ? <span className="text-muted-foreground">{dateLabel} · {t("pražský čas", "Prague time")}</span>
          : (waiting || failed) && revision ? <span className="text-muted-foreground">{t("Změny jsou uložené v CMS.", "Your changes are saved in CMS.")}</span>
          : null}
      </div>
      {link ? (
        <Button variant="ghost" size="sm" asChild>
          <a href={link} target="_blank" rel="noreferrer">
            {live ? t("Otevřít na webu", "Open on website") : t("Náhled uložené verze", "Preview saved version")}
            <ArrowUpRight aria-hidden="true" />
          </a>
        </Button>
      ) : (failed || waiting) && !checking ? (
        <Button variant="ghost" size="sm" onClick={onRetry}>{t("Ověřit znovu", "Check again")}</Button>
      ) : null}
    </div>
  );
}

export function ArticlePreview({
  values, bodyField, imageField, onClose, returnFocus,
}: {
  values: Record<string, unknown> | null;
  bodyField?: Field;
  imageField?: Field;
  onClose: () => void;
  returnFocus: () => void;
}) {
  const { t } = useLanguage();
  const [mobile, setMobile] = useState(false);
  const title = typeof values?.title === "string" && values.title.trim()
    ? values.title : t("Článek bez nadpisu", "Untitled article");
  const body = typeof values?.body === "string" ? values.body : "";
  const cover = typeof values?.image === "string" ? values.image : null;
  const coverMedia = typeof imageField?.options?.media === "string" ? imageField.options.media : null;
  const readonlyBodyField = useMemo(() => bodyField && {
    ...bodyField, readonly: true, options: { ...bodyField.options, switcher: false },
  }, [bodyField]);

  return (
    <Dialog open={Boolean(values)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus(); }}
        className="flex max-h-[90dvh] min-w-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <DialogHeader className="shrink-0 gap-2 border-b px-4 py-4 pr-12 text-left sm:px-6 sm:pr-12">
          <DialogTitle className="flex items-center gap-2"><Eye aria-hidden="true" className="size-4" />{t("Náhled článku", "Article preview")}</DialogTitle>
          <DialogDescription>{t("Náhled obsahu včetně neuložených změn. Vzhled na webu se řídí šablonou webu.", "Content preview including unsaved changes. The website uses its own template.")}</DialogDescription>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button type="button" variant={mobile ? "ghost" : "secondary"} size="sm" aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor aria-hidden="true" />{t("Počítač", "Desktop")}</Button>
            <Button type="button" variant={mobile ? "secondary" : "ghost"} size="sm" aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone aria-hidden="true" />{t("Mobil", "Mobile")}</Button>
          </div>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto bg-muted/40 p-3 sm:p-6">
          <article className={cn("mx-auto min-w-0 rounded-xl border bg-background p-5 shadow-sm", mobile ? "max-w-[375px]" : "max-w-2xl sm:p-8")}>
            <h2 className={cn("text-2xl font-semibold tracking-tight wrap-anywhere", !mobile && "sm:text-4xl")}>{title}</h2>
            {typeof values?.description === "string" && values.description.trim() && (
              <p className="mt-3 text-base leading-7 wrap-anywhere text-muted-foreground sm:text-lg">{values.description}</p>
            )}
            {cover && coverMedia && (
              <Thumbnail name={coverMedia} path={cover} alt={typeof values?.image_alt === "string" ? values.image_alt : ""}
                className="mt-5 aspect-video rounded-lg" />
            )}
            {body.trim() && readonlyBodyField ? (
              <div className="mt-5 min-w-0 [&_.tiptap]:min-h-0 [&_.tiptap]:border-0 [&_.tiptap]:bg-transparent [&_.tiptap]:p-0 [&_.tiptap]:wrap-anywhere [&_.tiptap]:shadow-none [&_.tiptap_img]:max-w-full [&_.tiptap_table]:table-fixed">
                <ArticleRichText value={body} field={readonlyBodyField} onChange={() => {}} />
              </div>
            ) : <p className="mt-5 text-sm text-muted-foreground">{t("Článek zatím nemá text.", "The article has no body text yet.")}</p>}
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PublishArticleDialog({
  open, onOpenChange, existingDate, canSchedule, published, withdraw, scheduled, onConfirm, returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingDate: string;
  canSchedule: boolean;
  published: boolean;
  withdraw: boolean;
  scheduled: boolean;
  onConfirm: (date?: string) => void;
  returnFocus: () => void;
}) {
  const { t, language } = useLanguage();
  const [date, setDate] = useState(existingDate);
  const [schedule, setSchedule] = useState(canSchedule && Boolean(existingDate));
  const [now] = useState(pragueDateTime);
  const validDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date) && date > now && Number.isFinite(Date.parse(date + "Z"));
  const scheduling = canSchedule && schedule;
  const dateLabel = validDate ? new Intl.DateTimeFormat(language === "cs" ? "cs-CZ" : "en-GB", {
    dateStyle: "long", timeStyle: "short", timeZone: "UTC",
  }).format(new Date(date + "Z")) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus(); }}
        className="max-h-[90dvh] overflow-y-auto"
      >
        <DialogHeader className="pr-6 text-left">
          <DialogTitle className="flex items-center gap-2"><Globe2 aria-hidden="true" className="size-5 shrink-0 text-primary" />
            {withdraw
              ? scheduled ? t("Zrušit naplánování?", "Cancel scheduled publication?") : t("Stáhnout článek z webu?", "Unpublish the article?")
              : t("Zveřejnění článku", "Publish article")}
          </DialogTitle>
          <DialogDescription>{withdraw
            ? t("Článek se uloží jako koncept včetně rozpracovaných úprav. Po synchronizaci nebude veřejně dostupný.", "The article and your edits will be saved as a draft. After syncing, it will no longer be public.")
            : published
            ? t("Po synchronizaci se tato verze zobrazí místo verze, která je nyní na webu.", "After syncing, this version replaces the one currently on the website.")
            : t("Zvolte, kdy se má článek objevit na veřejném webu.", "Choose when this article should appear on the public website.")}</DialogDescription>
        </DialogHeader>
        {canSchedule && !withdraw && (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">{t("Kdy zveřejnit", "Publication timing")}</legend>
            <label className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm"><input type="radio" name="article-timing" checked={!scheduling} onChange={() => setSchedule(false)} />{t("Hned po synchronizaci", "As soon as syncing finishes")}</label>
            <label className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm"><input type="radio" name="article-timing" checked={scheduling} onChange={() => setSchedule(true)} />{t("Naplánovat", "Schedule for later")}</label>
            {scheduling && <div className="grid min-w-0 gap-1.5 text-sm">
              <Label htmlFor="article-publication-date">{t("Datum a čas vydání (Praha)", "Date and time (Prague)")}</Label>
              <Input id="article-publication-date" type="datetime-local" value={date} min={now}
                onChange={(event) => setDate(event.target.value)} className="min-w-0" required
                aria-invalid={Boolean(date && !validDate)} aria-describedby={date ? "article-publication-date-detail" : undefined} />
              {date && <span id="article-publication-date-detail" className={validDate ? "text-muted-foreground" : "text-destructive"}>
                {dateLabel ?? t("Zadejte budoucí datum a čas.", "Enter a future date and time.")}
              </span>}
            </div>}
          </fieldset>
        )}
        <DialogFooter className="gap-2">
          <DialogClose asChild><Button variant="outline" type="button">{t("Zpět k úpravám", "Back to editing")}</Button></DialogClose>
          <Button type="button" variant={withdraw ? "destructive" : "default"} disabled={!withdraw && scheduling && !validDate}
            onClick={() => onConfirm(!withdraw && scheduling ? date : undefined)}>
            {withdraw ? t("Uložit jako koncept", "Save as draft")
              : scheduling ? t("Naplánovat zveřejnění", "Schedule publication")
              : published ? t("Zveřejnit změny", "Publish changes") : t("Zveřejnit článek", "Publish article")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
