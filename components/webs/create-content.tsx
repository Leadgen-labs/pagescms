"use client";

import { UiText } from "@/components/ui-text";
import { ui, useUi } from "@/components/use-ui";
import { useState } from "react";
import Link from "next/link";
import { useConfig } from "@/contexts/config-context";
import { resolveContentOperations } from "@/lib/operations";
import { publicProjectPath } from "@/lib/project-url";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function CreateContent() {
  const ui = useUi();
  const { config } = useConfig();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  if (!config?.repo.startsWith("webs-obsah-")) return null;
  const articles = (config.object.content ?? []).filter((item: {type: string; name: string}) => item.type === "collection" && item.name.startsWith("blog-") && resolveContentOperations({schema: item}).create);
  const newArticle = (name: string) => publicProjectPath(`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/new`);
  return (
    <div className="grid gap-2">
      {articles.length === 1 ? <Link className={buttonVariants()} href={newArticle(articles[0].name)}><UiText text={"Nový článek"}/></Link> : articles.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button><UiText text={"Nový článek"}/></Button></DropdownMenuTrigger>
          <DropdownMenuContent>{articles.map((item: {name: string; label?: string}) => <DropdownMenuItem key={item.name} asChild><Link href={newArticle(item.name)}>{item.label ?? item.name}</Link></DropdownMenuItem>)}</DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <Button variant="outline" onClick={() => setOpen(true)}><UiText text={"Nová stránka"}/></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><UiText text={"Nová stránka"}/></DialogTitle>
            <DialogDescription><UiText text={"Nová stránka potřebuje obsah, adresu a vzhled. Zadejte ji botovi, který připraví náhled. Na web se dostane až po vašem schválení. Stávající texty upravíte v sekci Stránky."}/></DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label htmlFor="new-page-title"><UiText text={"Název stránky"}/></Label><Input id="new-page-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ui("Například Ceník nebo Naše služby")} /></div>
            <div className="grid gap-2"><Label htmlFor="new-page-description"><UiText text={"Co má stránka obsahovat a kam patří v menu?"}/></Label><Textarea id="new-page-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={ui("Účel stránky, texty, fotky, požadovaná adresa…")} /></div>
            <Button disabled={!title.trim() || !description.trim()} onClick={() => {
              window.dispatchEvent(new CustomEvent("webs-open-chat", { detail: { text: ui("I want to create a new page: {0}\n\n{1}\n\nPrepare a preview for approval.",title.trim(),description.trim()) } }));
              setOpen(false);
            }}><UiText text={"Pokračovat do chatu"}/></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
