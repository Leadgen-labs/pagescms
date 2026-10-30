"use client";

import { ui, useUi } from "@/components/use-ui";
import { UiText } from "@/components/ui-text";
import { useState } from "react";
import { useConfig } from "@/contexts/config-context";
import { joinPathSegments, normalizePath } from "@/lib/utils/file";
import { toast } from "@/components/localized-toast";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type FolderCreateResult = {
  path: string;
  [key: string]: unknown;
};

const FolderCreate = ({
  children,
  path,
  type,
  name,
  onCreate,
}: {
  children: React.ReactElement<{ onClick: () => void }>;
  path: string;
  type: "content" | "media";
  name?: string;
  onCreate?: (entry: FolderCreateResult) => void;
}) => {
  const ui = useUi();
  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);

  const [open, setOpen] = useState(false);
  const [folderPath, setFolderPath] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    const normalizedFolderInput = normalizePath(folderPath.trim());
    if (!normalizedFolderInput) {
      toast.error(ui("Folder name is required."));
      return;
    }

    const fullNewPath = joinPathSegments([
      normalizePath(path),
      normalizedFolderInput,
    ]);

    setIsSubmitting(true);
    try {
      const createPromise: Promise<{
        status: string;
        message?: string;
        data: FolderCreateResult;
      }> = fetch(`/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/files/${encodeURIComponent(fullNewPath + "/.gitkeep")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name,
          content: "",
          onConflict: "error",
        }),
      }).then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 409) {
            throw new Error(`Folder \"${fullNewPath}\" already exists.`);
          }

          throw new Error(payload?.message || "Failed to create folder");
        }

        if (!payload || payload.status !== "success") {
          throw new Error(payload?.message || "Failed to create folder");
        }

        return payload;
      });

      await toast.promise(createPromise, {
        loading: `Creating folder "${fullNewPath}"`,
        success: `Folder "${fullNewPath}" created successfully.`,
        error: (error: any) => error.message,
      });

      const result = await createPromise;
      if (onCreate) onCreate(result.data);
      setFolderPath("");
      setOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setFolderPath("");
          setIsSubmitting(false);
        }
      }}
    >
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle><UiText text={"Create a folder"} /></DialogTitle>
          <DialogDescription><UiText text={"Choose a name for the folder to create"} />{path ? ` under "${normalizePath(path)}"` : null}.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!isSubmitting) await handleCreate();
          }}
          className="space-y-4"
        >
          <Input
            autoFocus
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={isSubmitting}><UiText text={"Cancel"} /></Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || !folderPath.trim()}><UiText text={"Create"} /></Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { FolderCreate };
