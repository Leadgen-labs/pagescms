"use client";

import { ErrorText } from "@/components/error-text";
import { ui, useUi } from "@/components/use-ui";
import { UiText } from "@/components/ui-text";
import { useLanguage } from "@/contexts/language-context";
import type { Language } from "@/lib/language";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import {
  handleSetCollaboratorLanguage,
  handleAddCollaborator,
  handleRemoveCollaborator,
  handleResendCollaboratorInvite,
} from "@/lib/actions/collaborator";
import { useRepoHeader } from "@/components/repo/repo-header-context";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { requireApiSuccess } from "@/lib/api-client";
import { toast } from "@/components/localized-toast";
import { BookText, EllipsisVertical, Loader } from "lucide-react";

type Collaborator = {
  id: number;
  email: string;
  language?: Language;
};

type AddCollaboratorState = {
  message?: string;
  error?: string;
  errors?: string[];
  data?: Collaborator[];
};

function InviteCollaboratorsDialog({
  owner,
  repo,
  state,
  action,
  open,
  onOpenChange,
  value,
  onValueChange,
  disabled,
  triggerLabel,
  triggerVariant = "outline",
  triggerSize = "default",
}: {
  owner: string;
  repo: string;
  state: AddCollaboratorState;
  action: (payload: FormData) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  disabled: boolean;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline";
  triggerSize?: "default" | "sm";
}) {
  const { t, language } = useLanguage();
  const parsedInviteEmails = useMemo(() => {
    return Array.from(
      new Set(
        value
          .split(/[\n,]+/)
          .map((email) => email.trim())
          .filter(Boolean),
      ),
    );
  }, [value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} disabled={disabled}>
          {triggerLabel || t("Pozvat", "Invite")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Pozvat spolupracovníky", "Invite collaborators")}</DialogTitle>
          <DialogDescription>
            <UiText text={"Enter one or multiple email addresses, separated by commas or new lines."} /> </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="owner" value={owner} />
          <input type="hidden" name="repo" value={repo} />
          <Textarea
            name="emails"
            placeholder="alice@example.com, bob@example.com"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            required
            rows={6}
          />
          <label className="grid gap-2 text-sm">{t("Výchozí jazyk collaboratora", "Collaborator default language")}
            <select name="language" defaultValue={language} className="h-10 rounded-md border bg-background px-3"><option value="cs">Čeština</option><option value="en">English</option></select>
            <span className="text-xs text-muted-foreground">{t("Použije se pro administraci i e-maily. U existujícího účtu zachováme jeho uloženou volbu.", "Used for administration and emails. Existing accounts keep their saved preference.")}</span>
          </label>
          {state?.error ? (
            <p className="text-sm font-medium text-destructive">
              <ErrorText text={String(state.error)}/>
            </p>
          ) : null}
          <DialogFooter>
            <SubmitButton
              type="submit"
              disabled={parsedInviteEmails.length === 0}
            >
              {t("Odeslat pozvánky", "Send invitations")}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Collaborators({
  owner,
  repo,
  branch,
}: {
  owner: string;
  repo: string;
  branch?: string;
}) {
  const ui = useUi();
  const { t } = useLanguage();
  const [savingLanguage, setSavingLanguage] = useState<number | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [addCollaboratorState, addCollaboratorAction] = useActionState<
    AddCollaboratorState,
    FormData
  >(handleAddCollaborator, {});
  const [emails, setEmails] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removing, setRemoving] = useState<number[]>([]);
  const [resending, setResending] = useState<number[]>([]);
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined | null>(null);

  const addNewCollaborator = useCallback((newCollaborators: Collaborator[]) => {
    setCollaborators((prevCollaborators) => {
      const seenIds = new Set(
        prevCollaborators.map((collaborator) => collaborator.id),
      );
      const uniqueCollaborators = newCollaborators.filter(
        (collaborator) => !seenIds.has(collaborator.id),
      );
      return [...prevCollaborators, ...uniqueCollaborators];
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchCollaborators() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/collaborators/${owner}/${repo}`, {
          signal: controller.signal,
        });
        const data = await requireApiSuccess<{
          status: string;
          data: Collaborator[];
          message?: string;
        }>(response, "Failed to fetch collaborators");

        setCollaborators(data.data);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(err);
        setError(
          err instanceof Error ? err.message : ui("Failed to fetch collaborators"),
        );
      } finally {
        // In React Strict Mode, an aborted first pass can race with the active request.
        // Keep the loading state until the non-aborted request finishes.
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchCollaborators();

    return () => controller.abort();
  }, [owner, repo, branch, ui]);

  useEffect(() => {
    if (addCollaboratorState?.message) {
      if (
        Array.isArray(addCollaboratorState.data) &&
        addCollaboratorState.data.length > 0
      ) {
        addNewCollaborator(addCollaboratorState.data);
      }

      toast.success(addCollaboratorState.message, { duration: 10000 });
      if (
        Array.isArray(addCollaboratorState.errors) &&
        addCollaboratorState.errors.length > 0
      ) {
        toast.error(addCollaboratorState.errors.join("\n"), {
          duration: 10000,
        });
      }
      setEmails("");
      setInviteDialogOpen(false);
    }
  }, [addCollaboratorState, addNewCollaborator]);

  const handleConfirmRemove = async (collaboratorId: number) => {
    setRemoving((prev) => [...prev, collaboratorId]);

    try {
      const removed = await handleRemoveCollaborator(
        collaboratorId,
        owner,
        repo,
      );

      if (removed.error) {
        toast.error(removed.error);
      } else {
        setCollaborators((prev) =>
          prev.filter((collaborator) => collaborator.id !== collaboratorId),
        );
        toast.success(removed.message);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPendingRemoveId(null);
      setRemoving((prev) => prev.filter((id) => id !== collaboratorId));
    }
  };

  const handleResendInvite = async (collaboratorId: number) => {
    setResending((prev) => [...prev, collaboratorId]);

    try {
      const resent = await handleResendCollaboratorInvite(
        collaboratorId,
        owner,
        repo,
      );
      if (resent.error) {
        toast.error(resent.error);
      } else {
        toast.success(resent.message);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResending((prev) => prev.filter((id) => id !== collaboratorId));
    }
  };

  const headerNode = useMemo(() => {
    const showInviteAction = !isLoading && !error && collaborators.length > 0;

    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg"><UiText text={"Collaborators"} /></h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <Link
                  href="https://pagescms.org/docs/configuration/collaborators/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <BookText />
                  <span className="sr-only"><UiText text={"Collaborators docs"} /></span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent><UiText text={"View docs"} /></TooltipContent>
          </Tooltip>
        </div>
        {showInviteAction ? (
          <InviteCollaboratorsDialog
            owner={owner}
            repo={repo}
            state={addCollaboratorState}
            action={addCollaboratorAction}
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
            value={emails}
            onValueChange={setEmails}
            disabled={isLoading}
            triggerVariant="default"
            triggerSize="default"
          />
        ) : null}
      </div>
    );
  }, [
    addCollaboratorAction,
    addCollaboratorState,
    collaborators.length,
    emails,
    error,
    inviteDialogOpen,
    isLoading,
    owner,
    repo,
  ]);

  useRepoHeader({ header: headerNode });

  const loadingSkeleton = useMemo(
    () => (
      <ul>
        {[0, 1, 2].map((index) => (
          <li
            key={index}
            className="flex gap-x-2 items-center border border-b-0 last:border-b first:rounded-t-md last:rounded-b-md px-3 py-2 text-sm"
          >
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-5 w-24 text-left rounded" />
            <Button
              variant="outline"
              size="icon-xs"
              className="ml-auto"
              disabled
            >
              <EllipsisVertical />
            </Button>
          </li>
        ))}
      </ul>
    ),
    [],
  );

  if (error) {
    return (
      <div className="absolute inset-0 p-4 md:p-6 flex items-center justify-center">
        <Empty className="max-w-[420px] flex-none">
          <EmptyHeader>
            <EmptyTitle>{t("Něco se nepodařilo", "Something went wrong")}</EmptyTitle>
            <EmptyDescription>
              <UiText text={"We couldn't load the list of collaborators."} /> </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const collaboratorToRemove =
    pendingRemoveId === null
      ? null
      : collaborators.find(
          (collaborator) => collaborator.id === pendingRemoveId,
        ) || null;

  return (
    <div className="h-full flex flex-col gap-4">
      {isLoading ? (
        loadingSkeleton
      ) : collaborators.length > 0 ? (
        <>
          <ul>
            {collaborators.map((collaborator) => (
              <li
                key={collaborator.id}
                className="flex gap-x-2 items-center border border-b-0 last:border-b first:rounded-t-md last:rounded-b-md px-3 py-2 text-sm"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={`https://unavatar.io/${collaborator.email}?fallback=false`}
                    alt={`${collaborator.email}'s avatar`}
                  />
                  <AvatarFallback className="font-medium text-muted-foreground uppercase text-xs">
                    {collaborator.email.split("@")[0].substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="font-medium text-left truncate">
                  {collaborator.email}
                </div>

                <select aria-label={t("Jazyk pro", "Language for") + " " + collaborator.email} className="ml-auto h-9 rounded-md border bg-background px-2 text-xs"
                  value={collaborator.language ?? "cs"} disabled={savingLanguage === collaborator.id}
                  onChange={async event => {
                    const language = event.target.value as Language;
                    setSavingLanguage(collaborator.id);
                    try {
                      const result = await handleSetCollaboratorLanguage(collaborator.id, owner, repo, language);
                      if (result.error) throw Error(result.error);
                      setCollaborators(old => old.map(c => c.id === collaborator.id ? {...c, language} : c));
                      toast.success(t("Jazyk administrace a e-mailů byl uložen.", "Administration and email language saved."));
                    } catch { toast.error(t("Jazyk se nepodařilo uložit.", "Could not save language.")); }
                    finally { setSavingLanguage(null); }
                  }}><option value="cs">Čeština</option><option value="en">English</option></select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon-xs"
                      variant="outline"
                      className="ml-auto"
                      disabled={
                        removing.includes(collaborator.id) ||
                        resending.includes(collaborator.id)
                      }
                    >
                      {removing.includes(collaborator.id) ||
                      resending.includes(collaborator.id) ? (
                        <Loader className="animate-spin" />
                      ) : (
                        <EllipsisVertical />
                      )}
                      <span className="sr-only">{t("Akce spolupracovníka", "Collaborator actions")}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => void handleResendInvite(collaborator.id)}
                      disabled={
                        removing.includes(collaborator.id) ||
                        resending.includes(collaborator.id)
                      }
                    >
                      {t("Poslat pozvánku znovu", "Resend invitation")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setPendingRemoveId(collaborator.id)}
                      disabled={
                        removing.includes(collaborator.id) ||
                        resending.includes(collaborator.id)
                      }
                    >
                      {t("Odebrat", "Remove")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>

          <AlertDialog
            open={Boolean(collaboratorToRemove)}
            onOpenChange={(open) => {
              if (!open) setPendingRemoveId(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("Odebrat přístup?", "Are you sure?")}</AlertDialogTitle>
                <AlertDialogDescription>
                  <UiText text={"This will remove access to \""}/>{owner}/{repo}<UiText text={"\" for \""}/>{collaboratorToRemove?.email}<UiText text={"\"."}/></AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("Zrušit", "Cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (!collaboratorToRemove) return;
                    void handleConfirmRemove(collaboratorToRemove.id);
                  }}
                >
                  <UiText text={"Remove collaborator"} /> </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <div className="flex-1 flex items-center">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("Žádní spolupracovníci", "No collaborators")}</EmptyTitle>
              <EmptyDescription>
                <UiText text={"Invite collaborators to give them access to this repository."} /> </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <InviteCollaboratorsDialog
                owner={owner}
                repo={repo}
                state={addCollaboratorState}
                action={addCollaboratorAction}
                open={inviteDialogOpen}
                onOpenChange={setInviteDialogOpen}
                value={emails}
                onValueChange={setEmails}
                disabled={isLoading}
                triggerLabel="Invite a collaborator"
                triggerVariant="default"
                triggerSize="default"
              />
            </EmptyContent>
          </Empty>
        </div>
      )}
    </div>
  );
}
