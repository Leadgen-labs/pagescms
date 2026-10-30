"use client";

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
  const { config } = useConfig();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  if (!config?.repo.startsWith("webs-obsah-")) return null;
  const articles = (config.object.content ?? []).filter((item: {type: string; name: string}) => item.type === "collection" && item.name.startsWith("blog-") && resolveContentOperations({schema: item}).create);
  const newArticle = (name: string) => publicProjectPath(`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/new`);
  return (
    <div className="grid gap-2">
      {articles.length === 1 ? <Link className={buttonVariants()} href={newArticle(articles[0].name)}>Nový článek</Link> : articles.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button>Nový článek</Button></DropdownMenuTrigger>
          <DropdownMenuContent>{articles.map((item: {name: string; label?: string}) => <DropdownMenuItem key={item.name} asChild><Link href={newArticle(item.name)}>{item.label ?? item.name}</Link></DropdownMenuItem>)}</DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <Button variant="outline" onClick={() => setOpen(true)}>Nová stránka</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nová stránka</DialogTitle>
            <DialogDescription>Nová stránka potřebuje obsah, adresu a vzhled. Zadejte ji botovi, který připraví náhled. Na web se dostane až po vašem schválení. Stávající texty upravíte v sekci Stránky.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label htmlFor="new-page-title">Název stránky</Label><Input id="new-page-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Například Ceník nebo Naše služby" /></div>
            <div className="grid gap-2"><Label htmlFor="new-page-description">Co má stránka obsahovat a kam patří v menu?</Label><Textarea id="new-page-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Účel stránky, texty, fotky, požadovaná adresa…" /></div>
            <Button disabled={!title.trim() || !description.trim()} onClick={() => {
              window.dispatchEvent(new CustomEvent("webs-open-chat", { detail: { text: `Chci vytvořit novou stránku: ${title.trim()}\n\n${description.trim()}\n\nPřipravte náhled ke schválení.` } }));
              setOpen(false);
            }}>Pokračovat do chatu</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
