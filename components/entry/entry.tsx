"use client";

import { ErrorText } from "@/components/error-text";
import { ui, useUi } from "@/components/use-ui";
import { UiText } from "@/components/ui-text";
import { Fragment, useEffect, useState, useMemo, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfig } from "@/contexts/config-context";
import { parseAndValidateConfig } from "@/lib/config";
import { resolveContentOperations } from "@/lib/operations";
import { requireApiSuccess } from "@/lib/api-client";
import { editorialCollection, pragueDateTime } from "@/lib/editorial-article";
import { publicProjectPath } from "@/lib/project-url";
import { projectName } from "@/lib/project-name";
import { useLanguage } from "@/contexts/language-context";
import { getSchemaActions } from "@/lib/actions";
import {
  generateFilename,
  getPrimaryField,
  getSchemaByName,
  safeAccess,
} from "@/lib/schema";
import {
  getFileExtension,
  getFileName,
  getParentPath,
  getRelativePath,
  joinPathSegments,
  normalizePath
} from "@/lib/utils/file";
import type { ApiSuccess, EntryData, EntryHistoryItem, FileSaveData } from "@/types/api";
import type { Field } from "@/types/field";
import { EntryForm } from "./entry-form";
import { ArticlePreview, ArticleStatus, PublishArticleDialog, type ArticleAction } from "./article-workflow";
import { useArticleReceipt } from "./use-article-receipt";
import { EntryHistoryDropdown } from "./entry-history";
import { EmptyCreate } from "@/components/empty-create";
import { FileOptions } from "@/components/file/file-options";
import { RepoActionButtons } from "@/components/repo/repo-action-buttons";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { useRepoHeader } from "@/components/repo/repo-header-context";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/localized-toast";
import { ArrowLeft, EllipsisVertical, Eye, History, Lock, LockOpen, Save, Settings2 } from "lucide-react";
import useSWR, { useSWRConfig } from "swr";

type LintView = {
  state: {
    doc: {
      toString(): string;
    };
  };
};

type GroupTrailItem = {
  name: string;
  label?: string | null;
};

export function Entry({
  name = "",
  path: initialPath,
  parent,
  title,
  headerMeta,
  onSave,
}: {
  name?: string;
  path?: string;
  parent?: string;
  title?: string;
  headerMeta?: ReactNode;
  onSave?: (data: Record<string, unknown>) => void;
}) {
  const ui = useUi();
  const { t } = useLanguage();
  const [path, setPath] = useState<string | undefined>(initialPath);
  const [entry, setEntry] = useState<EntryData | null>();
  const [sha, setSha] = useState<string | undefined>();
  const [displayTitle, setDisplayTitle] = useState<string>(() => {
    if (title) return title;
    if (initialPath && initialPath !== ".pages.yml") {
      return `Editing "${getFileName(normalizePath(initialPath))}"`;
    }
    return "Edit";
  });
  const [isLoading, setIsLoading] = useState(path ? true : false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [hasRegisteredChanges, setHasRegisteredChanges] = useState(false);
  const [error, setError] = useState<string | undefined | null>(null);
  const changeVersionRef = useRef(0);
  const draftButton = useRef<HTMLButtonElement>(null);
  const previewButton = useRef<HTMLButtonElement>(null);
  const publishButton = useRef<HTMLButtonElement>(null);
  const withdrawButton = useRef<HTMLButtonElement>(null);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [articlePreview, setArticlePreview] = useState<Record<string, unknown> | null>(null);
  const [articleDialog, setArticleDialog] = useState<"publish" | "withdraw" | null>(null);
  const [leaveArticlePath, setLeaveArticlePath] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  const router = useRouter();

  const { config } = useConfig();
  if (!config) throw new Error(`Configuration not found.`);

  const schema = useMemo(() => {
    if (!name) return;
    return getSchemaByName(config?.object, name)
  }, [config, name]);
  const schemaType = schema?.type;
  const isArticle = schemaType === "collection" && schema?.fields?.some((field: Field) => field.name === "body" && field.type === "rich-text")
    && editorialCollection(config.repo, config.branch, name, path)
    && (!parent || normalizePath(parent) === schema.path);
  const projectPath = `/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}`;
  const collectionPath = `${projectPath}/collection/${encodeURIComponent(name)}`;
  const siteName = isArticle ? projectName(config.repo, config.object) : "";
  const savedArticleStatus = entry?.contentObject?.status;
  const scheduledDate = typeof entry?.contentObject?.published_at === "string" ? entry.contentObject.published_at : "";
  const isPublishedArticle = savedArticleStatus === "published";
  const futurePublication = scheduledDate > pragueDateTime();
  const isScheduledArticle = isPublishedArticle && futurePublication;
  const articleDirty = isFormDirty || hasRegisteredChanges;
  const revision = isArticle && entry?.path === path ? entry?.revision : undefined;
  const articleApiUrl = isArticle ? `/api${projectPath}/webs-article` : null;
  const publication = useArticleReceipt(articleApiUrl, path, revision);
  const confirmedUrl = publication.receipt?.publicUrl || publication.receipt?.previewUrl;
  const articleAddress = confirmedUrl && URL.canParse(confirmedUrl) ? new URL(confirmedUrl).pathname
    : path ? getFileName(path).replace(/\.md$/i, "") : undefined;
  const operations = useMemo(
    () =>
      resolveContentOperations({
        schema,
        scope:
          path === ".pages.yml" || initialPath === ".pages.yml"
            ? "settings"
            : undefined,
      }),
    [initialPath, path, schema],
  );
  const canCreate = operations.create;
  const canRename = operations.rename;
  const canDelete = operations.delete;
  const isFileEditorMode = !schema?.fields || schema.fields.length === 0;
  const filenameFieldMode = useMemo(() => {
    if (!schema || schema.type !== "collection") return "hidden";
    if (schema.filenameField === true) return "enabled";
    if (schema.filenameField === "create") return "create";
    if (schema.filenameField === false) return "hidden";
    return isFileEditorMode ? "enabled" : "hidden";
  }, [isFileEditorMode, schema]);
  const showFilenameField = useMemo(() => {
    if (schemaType !== "collection") return false;
    if (filenameFieldMode === "enabled") return true;
    if (filenameFieldMode === "create") return !path;
    return false;
  }, [filenameFieldMode, path, schemaType]);
  const [filenameValue, setFilenameValue] = useState("");
  const [isFilenameUnlocked, setIsFilenameUnlocked] = useState(false);

  const entryFields = useMemo(() => {
    return !schema?.fields || schema.fields.length === 0
      ? [{
          name: "body",
          type: "code",
          label: showFilenameField ? ui("Content") : false,
          options: {
            format: schema?.extension || (entry?.name && getFileExtension(entry.name)) || "markdown",
            lintFn: path === ".pages.yml"
              ? (view: LintView) => {
                  const {parseErrors, validationErrors} = parseAndValidateConfig(view.state.doc.toString());
                  return [...parseErrors, ...validationErrors];
                }
              : undefined
          }
        }]
      : schema?.list === true
        ? [{
            name: "listWrapper",
            label: false,
            type: "object",
            list: true,
            fields: schema.fields
          }]
        : schema.fields;
  }, [schema, entry, path, showFilenameField, ui]);

  const entryContentObject = useMemo(() => {
    return path
      ? schema?.list === true
        ? { listWrapper: entry?.contentObject }
        : entry?.contentObject
      : schema?.list === true
        ? { listWrapper: [] }
        : {};
  }, [schema, entry, path]);

  useEffect(() => {
    if (!showFilenameField || schemaType !== "collection" || !schema) return;

    if (path) {
      setFilenameValue(getFileName(normalizePath(path)));
      setIsFilenameUnlocked(false);
      return;
    }

    const generated = generateFilename(schema.filename, schema, entryContentObject as Record<string, unknown>);
    setFilenameValue(isArticle ? "" : generated || "untitled");
    setIsFilenameUnlocked(true);
  }, [entryContentObject, isArticle, path, schema, schemaType, showFilenameField]);

  const entryApiUrl = useMemo(() => (
    path
      ? `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/entries/${encodeURIComponent(path)}?name=${encodeURIComponent(name)}`
      : null
  ), [config.branch, config.owner, config.repo, name, path]);

  const fetchEntryByUrl = useCallback(async (apiUrl: string): Promise<EntryData> => {
    const response = await fetch(apiUrl);
    const data = await requireApiSuccess<any>(
      response,
      "Failed to fetch entry",
    );
    return data.data as EntryData;
  }, []);

  const {
    data: swrEntryData,
    error: swrEntryError,
    isLoading: swrEntryLoading,
    mutate: mutateEntry,
  } = useSWR<EntryData>(
    entryApiUrl,
    fetchEntryByUrl,
    {
      revalidateOnFocus: !isArticle,
      revalidateOnReconnect: !isArticle,
      dedupingInterval: 2000,
    },
  );

  useEffect(() => {
    if (!path) return;
    setIsLoading(swrEntryLoading);
  }, [path, swrEntryLoading]);

  useEffect(() => {
    if (!swrEntryData || !path) return;
    setEntry(swrEntryData);
    setSha(swrEntryData.sha);
    setHasRegisteredChanges(false);
    setIsLoading(false);
    setError(null);

    if (initialPath && schema && schema.type === "collection") {
      const primaryField = getPrimaryField(schema);
      const primaryValue = primaryField
        ? safeAccess(swrEntryData.contentObject ?? {}, primaryField)
        : undefined;
      const hasPrimaryValue = typeof primaryValue === "string"
        ? primaryValue !== ""
        : primaryValue != null;
      const titleValue = hasPrimaryValue
        ? String(primaryValue)
        : getFileName(normalizePath(path));
      setDisplayTitle(`Editing "${titleValue}"`);
    } else if (!title && path && path !== ".pages.yml") {
      setDisplayTitle(`Editing "${getFileName(normalizePath(path))}"`);
    }
  }, [initialPath, path, schema, swrEntryData, title]);

  useEffect(() => {
    if (!swrEntryError) return;
    const message = swrEntryError instanceof Error ? swrEntryError.message : ui("Failed to fetch entry.");
    setError(message);
    setIsLoading(false);
  }, [swrEntryError, ui]);

  const historyApiUrl = useMemo(() => (
    path
      ? `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/entries/${encodeURIComponent(path)}/history?name=${encodeURIComponent(name)}`
      : null
  ), [config.branch, config.owner, config.repo, name, path]);

  const historyKey = useMemo(
    () => historyApiUrl ? [historyApiUrl, sha ?? ""] as const : null,
    [historyApiUrl, sha],
  );

  const fetchEntryHistory = useCallback(async ([apiUrl]: readonly [string, string]): Promise<EntryHistoryItem[]> => {
    const response = await fetch(apiUrl);
    const data = await requireApiSuccess<any>(
      response,
      "Failed to fetch entry's history",
    );
    return data.data as EntryHistoryItem[];
  }, []);

  const { data: historyData } = useSWR<EntryHistoryItem[]>(
    historyKey,
    fetchEntryHistory,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    },
  );

  const currentFilename = useMemo(
    () => path ? getFileName(normalizePath(path)) : "",
    [path],
  );
  const filenameChanged = showFilenameField
    && filenameValue.trim().length > 0
    && filenameValue.trim() !== currentFilename;

  const onSubmit = async (contentObject: Record<string, unknown>, action?: ArticleAction) => {
    if (isArticle && !action) return;
    setIsSaving(true);
    setArticleError(null);
    const submitStartChangeVersion = changeVersionRef.current;

    const savePromise = (async (): Promise<ApiSuccess<FileSaveData>> => {
        if (isArticle && (typeof contentObject.title !== "string" || !contentObject.title.trim())) {
          throw new Error(t("Doplňte nadpis článku.", "Enter a title for the article."));
        }
        if (action?.kind === "publish" && action.date && action.date <= pragueDateTime()) {
          throw new Error(t("Čas vydání musí být v budoucnosti.", "The publication time must be in the future."));
        }
        const articleValues: Record<string, unknown> = !action ? contentObject : {
          ...contentObject,
          status: action.kind === "publish" ? "published" : "draft",
          // Keep the original publication date when updating an already public article.
          published_at: action.kind === "withdraw" ? "" : action.kind === "draft" ? scheduledDate
            : action.date ?? (isScheduledArticle ? pragueDateTime() : isPublishedArticle ? scheduledDate : ""),
        };
        let savePath = path;
        const trimmedFilename = filenameValue.trim();
        const normalizedFilename = isArticle && !path && trimmedFilename
          ? trimmedFilename.replace(/\.md$/i, "") + ".md"
          : normalizePath(trimmedFilename).split("/").pop() || "";

        if (!isArticle && showFilenameField && !normalizedFilename) {
          throw new Error("Vyplňte název souboru.");
        }

        if (!savePath) {
          if (!schema) throw new Error("Cannot create entry without schema.");
          if (!canCreate) throw new Error("Creating entries in this content item isn't allowed.");
          const basePath = parent ?? schema.path;
          if (basePath == null) throw new Error("Cannot create entry without a target path.");
          const generatedFilename = showFilenameField && (!isArticle || normalizedFilename)
            ? normalizedFilename
            : generateFilename(schema.filename, schema, articleValues);
          if (isArticle && !/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(generatedFilename)) {
            throw new Error(t("Do adresy článku zadejte malá písmena bez diakritiky, čísla a pomlčky.", "Use lowercase letters, numbers and hyphens in the article address."));
          }
          savePath = joinPathSegments([basePath, generatedFilename]);
        } else if (filenameChanged && !canRename && schemaType === "collection") {
          throw new Error("Renaming this entry isn't allowed.");
        } else if (
          showFilenameField
          && filenameFieldMode === "enabled"
          && isFilenameUnlocked
          && filenameChanged
          && schemaType === "collection"
        ) {
          const newPath = joinPathSegments([getParentPath(savePath), normalizedFilename]);
          const renameResponse = await fetch(
            `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/files/${encodeURIComponent(savePath)}/rename`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "content",
                name,
                newPath,
              }),
            },
          );
          await requireApiSuccess<any>(renameResponse, "Failed to rename file");
          savePath = newPath;
          setPath(newPath);
          setIsFilenameUnlocked(false);
          router.replace(`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/edit/${encodeURIComponent(newPath)}`);

          const collectionKeyPrefix = `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collections/${encodeURIComponent(name)}?`;
          void mutate((key) => typeof key === "string" && key.startsWith(collectionKeyPrefix));
        }

        const response = await fetch(`/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/files/${encodeURIComponent(savePath)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: path === ".pages.yml" ? "settings" : "content",
            name,
            content: schema?.list === true
              ? articleValues.listWrapper
              : articleValues,
            sha,
            ...(isArticle && !path ? { onConflict: "error" } : {}),
          }),
        });
        const data = await requireApiSuccess<ApiSuccess<FileSaveData>>(
          response,
          "Failed to save file",
        );

        if (data.data.sha !== sha) setSha(data.data.sha);
        if (submitStartChangeVersion === changeVersionRef.current) {
          setHasRegisteredChanges(false);
          if (isArticle && path && data.data.sha && data.data.path) {
            const savedEntry: EntryData = {
              sha: data.data.sha,
              path: data.data.path,
              name: data.data.name,
              revision: data.data.revision,
              contentObject: articleValues,
            };
            setEntry(savedEntry);
            void mutateEntry(savedEntry, { revalidate: false });
          }
        }

        if (!path && schemaType === "collection" && data.data.path) {
          const next = `${collectionPath}/edit/${encodeURIComponent(data.data.path)}`;
          if (isArticle) router.replace(publicProjectPath(next));
          else router.push(next);
        }
        if (schemaType === "collection") {
          const collectionKeyPrefix = `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collections/${encodeURIComponent(name)}?`;
          void mutate((key) => typeof key === "string" && key.startsWith(collectionKeyPrefix));
        }

        return data;
    })();

    if (!isArticle) toast.promise(savePromise, {
      loading: "Saving your file",
      success: (response: ApiSuccess<FileSaveData>) => {
        if (onSave) onSave(response.data);
        return response.message;
      },
      error: (error: unknown) => error instanceof Error ? error.message : ui("Failed to save file."),
    });

    try {
      const result = await savePromise;
      if (isArticle) onSave?.(result.data);
      if (submitStartChangeVersion === changeVersionRef.current) {
        setHasRegisteredChanges(false);
      }
    } catch (error: unknown) {
      if (isArticle) {
        setArticleError(error instanceof Error ? error.message : t("Článek se nepodařilo uložit.", "Could not save the article."));
      } else if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = isLoading || isSaving;
  const requestArticleAction = useCallback((intent: "preview" | "draft" | "publish" | "withdraw", date?: string) => {
    const form = document.getElementById("entry-form");
    if (!(form instanceof HTMLFormElement)) return;
    const submitter = document.createElement("button");
    submitter.type = "submit";
    submitter.hidden = true;
    submitter.dataset.articleAction = intent;
    if (date) submitter.dataset.articleDate = date;
    form.append(submitter);
    form.requestSubmit(submitter);
    submitter.remove();
  }, []);

  useEffect(() => {
    if (!isArticle || !articleDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const checkNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setLeaveArticlePath(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", checkNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", checkNavigation, true);
    };
  }, [articleDirty, isArticle]);

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "s") return;
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.altKey) return;

      event.preventDefault();
      if (isBusy || articleDialog || articlePreview || leaveArticlePath) return;
      if (isArticle) {
        if (!articleDirty && path) return;
        if (isPublishedArticle) setArticleDialog("publish");
        else draftButton.current?.click();
        return;
      }

      const form = document.getElementById("entry-form");
      if (form instanceof HTMLFormElement) {
        form.requestSubmit();
      }
    };

    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, [articleDialog, articleDirty, articlePreview, isArticle, isBusy, isPublishedArticle, leaveArticlePath, path]);

  const handleDelete = useCallback((path: string) => {
    // TODO: disable save button or freeze form while deleting?
    if (schemaType === "collection") {
      const collectionKeyPrefix = `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collections/${encodeURIComponent(name)}?`;
      void mutate((key) => typeof key === "string" && key.startsWith(collectionKeyPrefix));
    }
    if (schemaType === "collection") {
      router.push(`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}`);
    } else {
      if (entryApiUrl) {
        void mutate(entryApiUrl, undefined, { revalidate: true });
      }
      void mutateEntry();
    }
  }, [config.branch, config.owner, config.repo, entryApiUrl, mutate, mutateEntry, name, router, schemaType]);

  const handleRename = useCallback((oldPath: string, newPath: string) => {
    if (schemaType === "collection") {
      const collectionKeyPrefix = `/api/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collections/${encodeURIComponent(name)}?`;
      void mutate((key) => typeof key === "string" && key.startsWith(collectionKeyPrefix));
    }
    if (entryApiUrl) {
      void mutate(entryApiUrl, undefined, { revalidate: false });
    }
    setPath(newPath);
    router.replace(`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}/edit/${encodeURIComponent(newPath)}`);
  }, [config.branch, config.owner, config.repo, entryApiUrl, mutate, name, router, schemaType]);

  const breadcrumbNode = useMemo(() => {
    if (!schema) {
      return <BreadcrumbPage className="font-semibold truncate">{displayTitle}</BreadcrumbPage>;
    }

    const groupTrail: GroupTrailItem[] = Array.isArray(schema.groupTrail)
      ? schema.groupTrail
      : [];

    if (schemaType !== "collection") {
      return (
        <>
          {groupTrail.map((group) => (
            <Fragment key={`group-${group.name}`}>
              <BreadcrumbItem>
                <span>{group.label || group.name}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </Fragment>
          ))}
          <BreadcrumbItem className="truncate">
            <BreadcrumbPage className="font-semibold truncate">{displayTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </>
      );
    }

    const rootLabel = schema.label || schema.name || name;

    if (!path) {
      return (
        <>
          {groupTrail.map((group) => (
            <Fragment key={`group-${group.name}`}>
              <BreadcrumbItem>
                <span>{group.label || group.name}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}`}>
                {rootLabel}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="truncate">
            <BreadcrumbPage className="font-semibold truncate">{displayTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </>
      );
    }

    const rootPath = normalizePath(schema.path);
    const parentPath = normalizePath(getParentPath(path));
    const relativePath = getRelativePath(parentPath, rootPath);
    const segments = relativePath ? relativePath.split("/").filter(Boolean) : [];

    const parentEntries = segments.map((segment, index) => ({
      name: segment,
      path: joinPathSegments([rootPath, segments.slice(0, index + 1).join("/")]),
    }));

    const immediateParent = parentEntries.length > 0 ? parentEntries[parentEntries.length - 1] : null;
    const middleEntries = parentEntries.length > 1 ? parentEntries.slice(0, -1) : [];

    return (
      <>
        {groupTrail.map((group) => (
          <Fragment key={`group-${group.name}`}>
            <BreadcrumbItem>
              <span>{group.label || group.name}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </Fragment>
        ))}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}`}>
              {rootLabel}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {middleEntries.length > 0 && (
          <>
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center">
                  <BreadcrumbEllipsis className="h-4 w-4" />
                  <span className="sr-only"><UiText text={"Show hidden segments"} /></span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {middleEntries.map((entry) => (
                    <DropdownMenuItem key={entry.path} asChild>
                      <Link href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}?path=${encodeURIComponent(entry.path)}`}>
                        {entry.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}

        {immediateParent && (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}?path=${encodeURIComponent(immediateParent.path)}`}>
                  {immediateParent.name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}

        <BreadcrumbItem className="truncate">
          <BreadcrumbPage className="font-semibold truncate">{displayTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </>
    );
  }, [config.branch, config.owner, config.repo, displayTitle, name, path, schema, schemaType]);
  const isCreationBlocked = !path && schemaType === "collection" && !canCreate;
  const showHeaderActions = error !== "Not found" && !isCreationBlocked;
  const headerActionsNode = useMemo(() => {
    if (!schema || !path) return null;

    if (schemaType === "file") {
      const fileActions = getSchemaActions(schema);
      if (fileActions.length === 0) return null;

      return (
        <RepoActionButtons
          actions={fileActions}
          owner={config.owner}
          repo={config.repo}
          refName={config.branch}
          contextType="file"
          contextName={schema.name}
          contextPath={path}
          contextData={{
            label: schema.label || schema.name,
            sha: sha ?? null,
            content: entry?.contentObject ?? null,
          }}
        />
      );
    }

    if (schemaType === "collection" && entry) {
      const entryActions = getSchemaActions(schema, "entry");
      if (entryActions.length === 0) return null;

      return (
        <RepoActionButtons
          actions={entryActions}
          owner={config.owner}
          repo={config.repo}
          refName={config.branch}
          contextType="entry"
          contextName={schema.name}
          contextPath={path}
          contextData={{
            label: schema.label || schema.name,
            entryName: entry.name ?? null,
            sha: sha ?? null,
            content: entry.contentObject ?? null,
          }}
        />
      );
    }

    return null;
  }, [config.branch, config.owner, config.repo, entry, path, schema, schemaType, sha]);

  const headerNode = useMemo(() => (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <Breadcrumb className="min-w-0 overflow-hidden">
          <BreadcrumbList className="min-w-0 flex-nowrap font-semibold text-lg">
            {breadcrumbNode}
          </BreadcrumbList>
        </Breadcrumb>
        {headerMeta}
      </div>
      {showHeaderActions && (
        <div className="flex shrink-0 items-center gap-x-2">
          {headerActionsNode}
          {path && (
            historyData && historyData.length > 0 && !isLoading
              ? (
                <EntryHistoryDropdown
                  history={historyData}
                  path={path}
                  triggerVariant="outline"
                  triggerSize="icon"
                />
              )
              : <Button variant="outline" size="icon" className="shrink-0" disabled><History /></Button>
          )}
          <Button
            type="submit"
            form="entry-form"
            disabled={
              isBusy ||
              (showFilenameField && filenameValue.trim().length === 0) ||
              (
                Boolean(path) &&
                !(
                  isFormDirty
                  || hasRegisteredChanges
                  || (
                    showFilenameField
                    && filenameFieldMode === "enabled"
                    && isFilenameUnlocked
                    && filenameChanged
                  )
                )
              )
            }
            aria-label={ui("Save")}
          >
            <Save className="size-4 sm:hidden" />
            <span className="hidden sm:inline"><UiText text={"Save"} /></span>
          </Button>
          {path && (
            <ButtonGroup>
              {sha
                ? (
                  <FileOptions
                    path={path}
                    sha={sha}
                    type={path === ".pages.yml" ? "settings" : (schemaType ?? "content")}
                    name={name}
                    canDelete={canDelete}
                    canRename={canRename}
                    onDelete={handleDelete}
                    onRename={handleRename}
                  >
                    <Button variant="outline" size="icon" disabled={isBusy}>
                      <EllipsisVertical />
                    </Button>
                  </FileOptions>
                )
                : <Button variant="outline" size="icon" disabled><EllipsisVertical /></Button>
              }
            </ButtonGroup>
          )}
        </div>
      )}
    </div>
  ), [breadcrumbNode, canDelete, canRename, filenameChanged, filenameFieldMode, filenameValue, handleDelete, handleRename, hasRegisteredChanges, headerActionsNode, headerMeta, historyData, isBusy, isFilenameUnlocked, isFormDirty, isLoading, name, path, schemaType, sha, showFilenameField, showHeaderActions, ui]);

  const articleHeader = useMemo(() => (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-auto">
        <Button asChild variant="ghost" size="icon-sm" className="shrink-0" aria-label={t("Zpět na články", "Back to articles")}>
          <Link href={publicProjectPath(collectionPath)}><ArrowLeft aria-hidden="true" /></Link>
        </Button>
        <div className="flex min-w-0 items-center gap-2 text-sm leading-tight">
          <span className="sr-only">{siteName}</span>
          <span className="shrink-0 text-muted-foreground">{t("Články", "Articles")}</span>
          <span aria-hidden="true" className="text-muted-foreground">/</span>
          <h1 className="truncate font-semibold">
            {path ? String(entry?.contentObject?.title || getFileName(path)) : t("Nový článek", "New article")}
          </h1>
        </div>
      </div>
      {!error && !isCreationBlocked && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 max-[359px]:gap-1">
          <Button asChild variant="ghost" size="icon" className="xl:hidden" aria-label={t("Detaily článku", "Article details")}>
            <a href="#article-details"><Settings2 aria-hidden="true" /></a>
          </Button>
          <Button ref={previewButton} type="button" onClick={() => requestArticleAction("preview")}
            variant="outline" className="px-2.5 max-[359px]:px-2" disabled={isBusy} aria-label={t("Náhled článku", "Article preview")}>
            <Eye aria-hidden="true" /><span className="hidden min-[420px]:inline">{t("Náhled", "Preview")}</span>
          </Button>
          {!isPublishedArticle && (
            <Button ref={draftButton} type="button" onClick={() => requestArticleAction("draft")}
              variant="outline" className="px-2.5" disabled={isBusy || Boolean(path && !articleDirty)}
              aria-label={t("Uložit koncept", "Save draft")}>
              <span className="hidden min-[360px]:inline">{t("Uložit koncept", "Save draft")}</span>
              <span className="min-[360px]:hidden">{t("Uložit", "Save")}</span>
            </Button>
          )}
          <Button ref={publishButton} type="button" className="px-2.5"
            aria-label={isScheduledArticle ? t("Upravit plán", "Edit schedule")
              : isPublishedArticle ? t("Zveřejnit změny", "Publish changes") : t("Zveřejnit", "Publish")}
            disabled={isBusy || Boolean(path && isPublishedArticle && !isScheduledArticle && !articleDirty)}
            onClick={() => setArticleDialog("publish")}>
            {isScheduledArticle ? t("Upravit plán", "Edit schedule") : (
              <>
                <span className="hidden min-[360px]:inline">{isPublishedArticle ? t("Zveřejnit změny", "Publish changes") : t("Zveřejnit", "Publish")}</span>
                <span className="min-[360px]:hidden">{t("Zveřejnit", "Publish")}</span>
              </>
            )}
          </Button>
          {path && historyData && historyData.length > 0 && !isLoading && (
            <EntryHistoryDropdown history={historyData} path={path} triggerVariant="outline" />
          )}
          {path && sha && (
            <FileOptions path={path} sha={sha} type="collection" name={name} canDelete={canDelete} canRename={canRename}
              onDelete={handleDelete} onRename={handleRename}>
              <Button type="button" variant="ghost" size="icon" disabled={isBusy || articleDirty}
                aria-label={t("Další akce článku", "More article actions")}><EllipsisVertical aria-hidden="true" /></Button>
            </FileOptions>
          )}
        </div>
      )}
    </div>
  ), [articleDirty, canDelete, canRename, collectionPath, entry, error, handleDelete, handleRename, historyData,
    isBusy, isCreationBlocked, isLoading, isPublishedArticle, isScheduledArticle, name, path, requestArticleAction, sha, siteName, t]);

  useRepoHeader({ header: isArticle ? articleHeader : headerNode });

  const loadingSkeleton = useMemo(() => (
    <div className="w-full max-w-screen-md mx-auto grid items-start gap-6">
      {path !== ".pages.yml"
        ?
          <>
            <div className="space-y-2">
              <Skeleton className="w-24 h-5 rounded" />
              <Skeleton className="w-full h-10 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="w-24 h-5 rounded" />
              <Skeleton className="w-full h-10 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="w-24 h-5 rounded" />
              <div className="grid grid-flow-col auto-cols-max gap-4">
                <Skeleton className="w-28 h-28 rounded-md" />
                <Skeleton className="w-28 h-28 rounded-md" />
                <Skeleton className="w-28 h-28 rounded-md" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="w-24 h-5 rounded" />
              <Skeleton className="w-full h-60 rounded-md" />
            </div>
          </>
        : <Skeleton className="w-full h-96 rounded-md" />
      }
    </div>
  ), [path]);


  if (error && isArticle) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-5" role="alert">
        <h2 className="font-semibold">{t("Článek se nepodařilo načíst", "Could not load the article")}</h2>
        <p className="mt-1 text-sm text-muted-foreground wrap-anywhere"><ErrorText text={String(error)} /></p>
        <Button className="mt-4" variant="outline" onClick={() => void mutateEntry().catch(() => {})}>
          {t("Zkusit znovu", "Try again")}
        </Button>
      </div>
    );
  }

  if (error) {
    // TODO: should we use a custom error class with code?
    // TODO: errors show no header (unlike collection and media). Consider standardizing templates.
    if (error === "Not found") {
      const isSettingsPage = path === ".pages.yml";
      return (
        <div className="absolute inset-0 p-4 md:p-6 flex items-center justify-center">
          <Empty className="max-w-[420px] flex-none">
            <EmptyHeader>
              <EmptyTitle>{isSettingsPage ? ui("Configuration not found") : ui("File not found")}</EmptyTitle>
              <EmptyDescription>
                {isSettingsPage
                  ? ui("The configuration file \".pages.yml\" does not exist yet.")
                  : `The file "${path ?? schema?.path ?? "unknown"}" does not exist yet.`}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {isSettingsPage ? (
                <EmptyCreate type="settings"><UiText text={"Create configuration file"} /></EmptyCreate>
              ) : canCreate ? (
                <EmptyCreate type="content" name={schema?.name ?? name}><UiText text={"Create file"} /></EmptyCreate>
              ) : null}
            </EmptyContent>
          </Empty>
        </div>
      );
    } else {
      return (
        <div className="absolute inset-0 p-4 md:p-6 flex items-center justify-center">
          <Empty className="max-w-[420px] flex-none">
            <EmptyHeader>
              <EmptyTitle><UiText text={"Something went wrong"} /></EmptyTitle>
              <EmptyDescription><ErrorText text={String(error)}/></EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
                href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/configuration`}
              >
                <UiText text={"Go to configuration"} /> </Link>
            </EmptyContent>
          </Empty>
        </div>
      );
    }
  }

  if (!path && schemaType === "collection" && !canCreate) {
    return (
      <div className="absolute inset-0 p-4 md:p-6 flex items-center justify-center">
        <Empty className="max-w-[420px] flex-none">
          <EmptyHeader>
            <EmptyTitle><UiText text={"Creating entries is disabled"} /></EmptyTitle>
            <EmptyDescription>
              <UiText text={"New entries are not allowed for this collection."} /> </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
              href={`/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/collection/${encodeURIComponent(name)}`}
            >
              <UiText text={"Back to collection"} /> </Link>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  if (isLoading) return loadingSkeleton;

  const editorForm = <EntryForm
        fields={entryFields}
        contentObject={entryContentObject}
        onSubmit={onSubmit}
        filePath={
          showFilenameField
            ? <InputGroup data-disabled={path ? !isFilenameUnlocked : false}>
                <InputGroupInput
                  id="entry-filename"
                  value={filenameValue}
                  onChange={(event) => {
                    setFilenameValue(event.target.value);
                    if (isArticle) setHasRegisteredChanges(true);
                  }}
                  placeholder={isArticle ? t("Podle nadpisu", "Based on the title") : ui("Filename")}
                  disabled={path ? !isFilenameUnlocked : false}
                  aria-label={isArticle ? t("Adresa článku", "Article address") : ui("Filename")}
                />
                {path && filenameFieldMode === "enabled" && canRename && (
                  <InputGroupAddon align="inline-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InputGroupButton
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setIsFilenameUnlocked((prev) => !prev)}
                          aria-label={isFilenameUnlocked ? ui("Lock filename") : ui("Unlock filename")}
                        >
                          {isFilenameUnlocked
                            ? <LockOpen className="size-3.5" />
                            : <Lock className="size-3.5" />}
                        </InputGroupButton>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isFilenameUnlocked ? ui("Lock filename") : ui("Unlock to edit")}
                      </TooltipContent>
                    </Tooltip>
                  </InputGroupAddon>
                )}
              </InputGroup>
            : undefined
        }
        onDirtyChange={setIsFormDirty}
        onChangeRegistered={() => {
          changeVersionRef.current += 1;
          setHasRegisteredChanges(true);
        }}
        article={isArticle ? {
          busy: isSaving,
          address: articleAddress,
          onPreview: (values) => { setArticleError(null); setArticlePreview(values); },
          onPublishAttempt: () => setArticleDialog(null),
          onPreparationError: (error) => setArticleError(error instanceof Error ? error.message : t("Článek se nepodařilo připravit.", "Could not prepare the article.")),
          withdrawAction: isPublishedArticle && (
            <Button ref={withdrawButton} type="button" variant="ghost" className="h-auto min-h-10 w-full justify-start whitespace-normal text-destructive"
              disabled={isBusy} onClick={() => setArticleDialog("withdraw")}>
              {isScheduledArticle ? t("Zrušit naplánování", "Cancel schedule") : t("Stáhnout z webu", "Unpublish")}
            </Button>
          ),
        } : undefined}
      />;

  if (!isArticle) return editorForm;

  return (
    <div className="@container/article mx-auto min-w-0 max-w-[1160px] space-y-4">
      <ArticleStatus receipt={publication.receipt} revision={revision} configuredStatus={savedArticleStatus}
        changed={articleDirty} busy={isSaving} failed={publication.failed} checking={publication.checking} onRetry={publication.retry}
      />
      {articleError && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm sm:p-4">
          <p className="font-semibold text-destructive">{t("Akci se nepodařilo dokončit", "Could not complete the action")}</p>
          <p className="mt-1 wrap-anywhere"><ErrorText text={articleError} /></p>
          <p className="mt-1 text-muted-foreground">{t("Text zůstává v editoru.", "Your text is still in the editor.")}</p>
        </div>
      )}
      {editorForm}
      <ArticlePreview values={articlePreview} bodyField={entryFields.find((field: Field) => field.name === "body")}
        imageField={entryFields.find((field: Field) => field.name === "image")}
        onClose={() => setArticlePreview(null)} returnFocus={() => previewButton.current?.focus()} />
      {articleDialog && (
        <PublishArticleDialog open onOpenChange={(open) => { if (!open) setArticleDialog(null); }}
          canSchedule={!isPublishedArticle || isScheduledArticle} published={isPublishedArticle && !isScheduledArticle}
          existingDate={futurePublication ? scheduledDate : ""} withdraw={articleDialog === "withdraw"} scheduled={isScheduledArticle}
          onConfirm={(date) => requestArticleAction(articleDialog, date)}
          returnFocus={() => (articleDialog === "withdraw" ? withdrawButton : publishButton).current?.focus()}
        />
      )}
      <AlertDialog open={Boolean(leaveArticlePath)} onOpenChange={(open) => { if (!open) setLeaveArticlePath(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Opustit článek?", "Leave the article?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("V editoru máte neuložené změny. Odchodem se zahodí.", "You have unsaved changes. Leaving will discard them.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Zůstat v editoru", "Stay in the editor")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (leaveArticlePath) router.push(leaveArticlePath); }}>
              {t("Opustit článek", "Leave article")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
