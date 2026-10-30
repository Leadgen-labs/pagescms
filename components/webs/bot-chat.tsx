"use client";

// Chat s botem agentury webs v administraci (úprava instance). Stejný bot jako
// ve WhatsAppu nebo Slacku: úpravy vzhledu, nové stránky, dotazy. Zprávy jdou
// přes /api/[owner]/[repo]/[branch]/webs-bot, historie zůstává v prohlížeči.

import { ErrorText } from "@/components/error-text";
import { UiText } from "@/components/ui-text";
import { useLanguage } from "@/contexts/language-context";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, MessageCircle, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useConfig } from "@/contexts/config-context";
import { cn } from "@/lib/utils";

const CONTENT_REPO_PREFIX = "webs-obsah-";
const POLL_OPEN_MS = 4000;
const POLL_CLOSED_MS = 60000;
const HISTORY_LIMIT = 100;

type ChatAction = { action: string; label: string; value: string; style?: "primary" | "danger" };
type BotMessage = {
  id: number;
  text: string;
  link?: { url: string; label: string };
  image?: { url: string; alt: string };
  actions?: ChatAction[];
  at: string;
};
type Item =
  | { kind: "client"; key: string; text: string; at: string }
  | ({ kind: "bot"; key: string; used?: boolean } & BotMessage)
  | { kind: "note"; key: string; text: string; at: string };
type OpenRequest = { id: string; kind: string; state_label: string; channel: string; preview_url?: string };
type ChatResponse = { site: { slug: string; name: string }; messages: BotMessage[]; requests: OpenRequest[]; note?: string };

const now = () => new Date().toISOString();

function loadHistory(key: string): Item[] {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Item[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(key: string, items: Item[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(items.slice(-HISTORY_LIMIT)));
  } catch {}
}

export function BotChat() {
  const { t } = useLanguage();
  const { config } = useConfig();
  const enabledRepo = Boolean(config?.repo?.startsWith(CONTENT_REPO_PREFIX));
  const apiUrl = config ? `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/webs-bot` : "";
  const storageKey = config ? `webs-bot-chat:${config.owner}/${config.repo}` : "";

  const [available, setAvailable] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [requests, setRequests] = useState<OpenRequest[]>([]);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (storageKey) setItems(loadHistory(storageKey));
  }, [storageKey]);

  const append = useCallback(
    (next: Item[]) => {
      if (!next.length) return;
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.key));
        const merged = [...prev, ...next.filter((i) => !seen.has(i.key))];
        saveHistory(storageKey, merged);
        return merged;
      });
    },
    [storageKey],
  );

  const call = useCallback(
    async (payload: Record<string, string>): Promise<ChatResponse | null> => {
      const res = await fetch(apiUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const json: any = await res.json().catch(() => null);
      if (res.status === 404) {
        setAvailable(false);
        return null;
      }
      if (!res.ok || json?.status !== "success") throw new Error(json?.message || "Bot teď neodpovídá, zkuste to prosím za chvíli.");
      setAvailable(true);
      const data = json.data as ChatResponse;
      const fromBot: Item[] = data.messages.map((m) => ({ kind: "bot", key: `bot-${m.id}`, ...m }));
      append([...fromBot, ...(data.note ? [{ kind: "note" as const, key: `note-${Date.now()}`, text: data.note, at: now() }] : [])]);
      if (fromBot.length && !openRef.current) setUnread((n) => n + fromBot.length);
      setRequests(data.requests ?? []);
      return data;
    },
    [apiUrl, append],
  );

  // Dotazování na nové zprávy: často při otevřeném panelu, jinak jen občas.
  useEffect(() => {
    if (!enabledRepo || !apiUrl || available === false) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        await call({ op: "poll" });
        if (alive) setError(null);
      } catch (err: any) {
        if (alive && openRef.current) setError(err?.message ?? String(err));
      }
      if (alive) timer = setTimeout(tick, openRef.current ? POLL_OPEN_MS : POLL_CLOSED_MS);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [apiUrl, available, call, enabledRepo, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [items, open]);

  const send = async () => {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    setError(null);
    append([{ kind: "client", key: `client-${Date.now()}`, text: message, at: now() }]);
    setText("");
    try {
      await call({ op: "send", text: message });
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setText(message);
    } finally {
      setSending(false);
    }
  };

  const press = async (item: Extract<Item, { kind: "bot" }>, action: ChatAction) => {
    setError(null);
    setItems((prev) => {
      const next = prev.map((i) => (i.key === item.key ? { ...i, used: true } : i));
      saveHistory(storageKey, next);
      return next;
    });
    append([{ kind: "client", key: `client-${Date.now()}`, text: action.label, at: now() }]);
    try {
      await call({ op: "action", action: action.action, value: action.value });
    } catch (err: any) {
      setError(err?.message ?? String(err));
    }
  };

  if (!enabledRepo || !available) return null;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 h-11 rounded-full px-4 shadow-lg"
        aria-label={unread ? t(`Chat s botem, ${unread} nových zpráv`, `Chat with the bot, ${unread} new messages`) : t("Chat s botem", "Chat with the bot")}
      >
        <MessageCircle className="size-4" />
        <span><UiText text={"Napsat botovi"} /></span>
        {unread > 0 && <span className="ml-1 rounded-full bg-background px-1.5 text-xs font-semibold text-foreground">{unread}</span>}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4">
            <SheetTitle><UiText text={"Chat s botem"} /></SheetTitle>
            <SheetDescription>
              {t("Úpravy vzhledu, nové stránky, dotazy. Napište vše najednou jako zadání, bot připraví náhled ke schválení a pošle ho i e-mailem.", "Design changes, new pages and questions. Describe the request in one message. The bot prepares a preview for approval and emails it to you.")}
            </SheetDescription>
          </SheetHeader>

          {requests.length > 0 && (
            <div className="space-y-1 border-b bg-muted/50 px-4 py-2 text-xs">
              {requests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-x-2">
                  <span className="font-medium">{r.kind}:</span>
                  <span className="text-muted-foreground">{r.state_label}</span>
                  {r.channel !== "administrace" && <span className="text-muted-foreground"><UiText text={"(kanál"}/>{r.channel})</span>}
                  {r.preview_url && (
                    <a href={r.preview_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                      <UiText text={"náhled"}/><ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {items.length === 0 && <p className="text-sm text-muted-foreground"><UiText text={"Zatím žádné zprávy. Napište, co chcete na webu změnit."} /></p>}
            {items.map((item) =>
              item.kind === "client" ? (
                <div key={item.key} className="ml-8 rounded-lg bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
                  {item.text}
                </div>
              ) : item.kind === "note" ? (
                <p key={item.key} className="text-center text-xs text-muted-foreground">
                  {item.text}
                </p>
              ) : (
                <div key={item.key} className="mr-8 space-y-2 rounded-lg border bg-background px-3 py-2 text-sm">
                  <div className="whitespace-pre-wrap">{item.text}</div>
                  {item.image && <img src={item.image.url} alt={item.image.alt} className="w-full rounded-md border" loading="lazy" />}
                  {item.link && (
                    <a
                      href={item.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
                    >
                      {item.link.label} <ExternalLink className="size-3.5" />
                    </a>
                  )}
                  {item.actions?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {item.actions.map((a) => (
                        <Button
                          key={`${a.action}-${a.value}`}
                          type="button"
                          size="sm"
                          variant={a.style === "danger" ? "destructive" : a.style === "primary" ? "default" : "secondary"}
                          disabled={item.used}
                          onClick={() => press(item, a)}
                        >
                          {a.label}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ),
            )}
          </div>

          <form
            className="space-y-2 border-t p-4"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            {error && (
              <p className="text-sm text-destructive" role="alert">
                <ErrorText text={String(error)}/>
              </p>
            )}
            <label htmlFor="webs-bot-message" className="sr-only">
              <UiText text={"Zpráva pro bota"} /> </label>
            <Textarea
              id="webs-bot-message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={t("Např. Na úvodní stránku přidejte sekci s referencemi…", "For example: Add a testimonials section to the homepage…")}
              className="max-h-48 min-h-20"
              maxLength={8000}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground"><UiText text={"Ctrl + Enter odešle"} /></span>
              <Button type="submit" size="sm" disabled={sending || !text.trim()}>
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                <UiText text={"Odeslat"} /> </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
