"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  Drawer,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerHeading,
  Form,
  Chip,
} from "@heroui/react"

import { usePreferencesStore } from "@/lib/store/preferences-store"
import { cn } from "@/lib/utils"
import { Button } from "@heroui/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@heroui/react"
import { Input } from "@heroui/react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@heroui/react"
import {
  FileSystemFolderGlyph,
  FileTypeIcon,
  formatByteSize,
  formatTimestamp,
  MIME_TYPE_LABELS,
  mimeTypeForFile,
} from "@/components/explorer/internals"
import type {
  FileSystemEntry,
  FileSystemFileItem,
  FileSystemIndex,
} from "@/components/explorer/types"
import { AppIcon, ArrowRight01Icon, Share08Icon } from "@/components/foundations/icons"

type BulkProgress = { done: number; total: number }

function BulkProgressBar({
  verb,
  progress,
}: {
  verb: string
  progress: BulkProgress
}) {
  const t = useTranslations("Dialogs")
  const percent = progress.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {t("progress", {
            verb,
            done: progress.done,
            total: progress.total,
          })}
        </span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export function NewFolderDialog({
  currentFolderName,
  error,
  isPending,
  name,
  onNameChangeAction,
  onOpenChangeAction,
  onSubmitAction,
  open,
}: {
  currentFolderName: string
  error: string | null
  isPending: boolean
  name: string
  onNameChangeAction: (name: string) => void
  onOpenChangeAction: (open: boolean) => void
  onSubmitAction: () => void
  open: boolean
}) {
  const t = useTranslations("Dialogs")
  const tc = useTranslations("Common")
  return (
    <Modal open={open} onOpenChange={onOpenChangeAction}>
      {open ? (
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>{t("newFolderTitle")}</ModalTitle>
            <ModalDescription>
              {t("newFolderDescription", { folder: currentFolderName })}
            </ModalDescription>
          </ModalHeader>
          <ModalPanel>
            <Form
              id="new-folder-form"
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                onSubmitAction()
              }}
            >
              <Input
                autoFocus
                value={name}
                onChange={(event) => onNameChangeAction(event.target.value)}
                placeholder={t("newFolderPlaceholder")}
                aria-invalid={error ? true : undefined}
              />
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
            </Form>
          </ModalPanel>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChangeAction(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="submit"
              form="new-folder-form"
              loading={isPending}
              disabled={!name.trim()}
            >
              {t("create")}
            </Button>
          </ModalFooter>
        </ModalContent>
      ) : null}
    </Modal>
  )
}

export function RenameEntryDialog({
  entry,
  error,
  isPending,
  name,
  onNameChangeAction,
  onOpenChangeAction,
  onSubmitAction,
}: {
  entry: FileSystemEntry | null
  error: string | null
  isPending: boolean
  name: string
  onNameChangeAction: (name: string) => void
  onOpenChangeAction: (open: boolean) => void
  onSubmitAction: () => void
}) {
  const t = useTranslations("Dialogs")
  const tc = useTranslations("Common")
  const open = entry !== null

  const selectBaseName = (element: HTMLInputElement) => {
    if (!entry) return
    const dotIndex = entry.kind === "file" ? name.lastIndexOf(".") : -1

    element.setSelectionRange(0, dotIndex > 0 ? dotIndex : name.length)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChangeAction}>
      {entry ? (
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>
              {entry.kind === "folder"
                ? t("renameFolderTitle")
                : t("renameFileTitle")}
            </ModalTitle>
            <ModalDescription>
              {t("renameDescription", { name: entry.name })}
            </ModalDescription>
          </ModalHeader>
          <ModalPanel>
            <Form
              id="rename-entry-form"
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                onSubmitAction()
              }}
            >
              <Input
                autoFocus
                value={name}
                aria-label={t("renameNameLabel")}
                aria-invalid={error ? true : undefined}
                placeholder={t("renamePlaceholder")}
                onChange={(event) => onNameChangeAction(event.target.value)}
                onFocus={(event) => selectBaseName(event.currentTarget)}
              />
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
            </Form>
          </ModalPanel>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChangeAction(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="submit"
              form="rename-entry-form"
              loading={isPending}
              disabled={!name.trim()}
            >
              {t("rename")}
            </Button>
          </ModalFooter>
        </ModalContent>
      ) : null}
    </Modal>
  )
}

// Trailing-slash path → display segments and per-segment absolute paths.
function pathSegments(folderPath: string) {
  const trimmed = folderPath.replace(/\/$/, "")
  if (!trimmed) return [] as Array<{ name: string; path: string }>
  const names = trimmed.split("/")
  return names.map((name, index) => ({
    name,
    path: `${names.slice(0, index + 1).join("/")}/`,
  }))
}

export function MoveEntriesDialog({
  error,
  isPending,
  progress,
  index,
  ensureChildrenAction,
  loadingFolders,
  rootLabel = "/",
  onMoveAction,
  onOpenChangeAction,
  targets,
}: {
  error: string | null
  isPending: boolean
  progress?: BulkProgress | null
  index: FileSystemIndex
  ensureChildrenAction: (folderPath: string) => void
  loadingFolders: ReadonlySet<string>
  rootLabel?: string
  onMoveAction: (destination: string) => void
  onOpenChangeAction: (open: boolean) => void
  targets: FileSystemEntry[]
}) {
  const t = useTranslations("Dialogs")
  const tc = useTranslations("Common")
  const open = targets.length > 0
  // The folder currently being browsed; "" is the bucket root.
  const [navPath, setNavPath] = React.useState("")

  // Reset to root whenever the dialog opens.
  React.useEffect(() => {
    if (open) setNavPath("")
  }, [open])

  // Lazily list the current folder's children as the user drills in.
  React.useEffect(() => {
    if (open) ensureChildrenAction(navPath)
  }, [open, navPath, ensureChildrenAction])

  // Folders being moved (and their descendants) can't be a destination.
  const movedFolderPaths = targets
    .filter((target) => target.kind === "folder")
    .map((target) => target.path)
  const isInsideMoved = movedFolderPaths.some(
    (path) => navPath === path || navPath.startsWith(path)
  )

  const subfolders = (index.children.get(navPath) ?? []).filter(
    (entry) =>
      entry.kind === "folder" &&
      !movedFolderPaths.some(
        (path) => entry.path === path || entry.path.startsWith(path)
      )
  )
  const isLoading = loadingFolders.has(navPath)
  const allAlreadyHere = targets.every(
    (target) => target.parentPath === navPath
  )
  const canMoveHere = !isPending && !isInsideMoved && !allAlreadyHere
  const segments = pathSegments(navPath)

  return (
    <Modal open={open} onOpenChange={onOpenChangeAction}>
      {open ? (
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>
              {targets.length > 1
                ? t("moveItemsTitle", { count: targets.length })
                : targets[0].kind === "folder"
                  ? t("moveFolderTitle")
                  : t("moveFileTitle")}
            </ModalTitle>
            <ModalDescription>{t("moveDescription")}</ModalDescription>
          </ModalHeader>
          <ModalPanel className="space-y-2">
            {/* Breadcrumb of the browsing path. */}
            <div className="flex flex-wrap items-center gap-0.5 text-sm">
              <button
                type="button"
                onClick={() => setNavPath("")}
                className={cn(
                  "rounded px-1.5 py-0.5 font-medium transition-colors hover:bg-accent",
                  navPath === "" && "text-foreground"
                )}
              >
                {rootLabel}
              </button>
              {segments.map((segment, index) => (
                <React.Fragment key={segment.path}>
                  {index > 0 || !rootLabel.endsWith("/") ? (
                    <span className="text-muted-foreground">/</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setNavPath(segment.path)}
                    className="max-w-40 truncate rounded px-1.5 py-0.5 transition-colors hover:bg-accent"
                  >
                    {segment.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Subfolder list for the current level. */}
            <div className="h-56 overflow-y-auto rounded-md border p-1">
              {isLoading && subfolders.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {t("moveLoading")}
                </div>
              ) : subfolders.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {t("moveNoSubfolders")}
                </div>
              ) : (
                subfolders.map((folder) => (
                  <button
                    key={folder.path}
                    type="button"
                    onClick={() => setNavPath(folder.path)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
                  >
                    <FileSystemFolderGlyph className="h-3.5 w-auto shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {folder.name}
                    </span>
                    <AppIcon
                      icon={ArrowRight01Icon}
                      className="size-3.5 shrink-0 text-muted-foreground/60"
                    />
                  </button>
                ))
              )}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {progress ? (
              <BulkProgressBar verb={t("moving")} progress={progress} />
            ) : null}
          </ModalPanel>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChangeAction(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              loading={isPending}
              disabled={!canMoveHere}
              onClick={() => onMoveAction(navPath)}
            >
              {navPath === ""
                ? t("moveToRoot", { root: rootLabel })
                : t("moveToFolder", {
                    name: segments[segments.length - 1]?.name ?? "",
                  })}
            </Button>
          </ModalFooter>
        </ModalContent>
      ) : null}
    </Modal>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-start gap-3 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm wrap-break-word">{value}</dd>
    </div>
  )
}

export function InfoEntryDialog({
  entry,
  onOpenChangeAction,
}: {
  entry: FileSystemEntry | null
  onOpenChangeAction: (open: boolean) => void
}) {
  const t = useTranslations("Dialogs")
  const tc = useTranslations("Common")
  const timeFormat = usePreferencesStore((state) => state.timeFormat)
  const open = entry !== null
  const isFolder = entry?.kind === "folder"

  // The folder this entry lives in; "" is the bucket root.
  const location = entry?.parentPath ? entry.parentPath : "/"
  const mime = entry && !isFolder ? mimeTypeForFile(entry) : null
  const typeLabel = mime ? (MIME_TYPE_LABELS[mime] ?? mime) : null
  const size = entry && !isFolder ? (formatByteSize(entry.size) ?? "—") : null
  const created = formatTimestamp(entry?.createdAt, timeFormat)
  const modified = formatTimestamp(entry?.updatedAt, timeFormat)

  return (
    <Drawer open={open} onOpenChange={onOpenChangeAction} backdrop="blur">

      {entry ? (
        <DrawerContent className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background p-6 shadow-2xl">
          <DrawerHeader className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              {isFolder ? (
                <FileSystemFolderGlyph className="h-8 w-auto shrink-0 drop-shadow-xs" />
              ) : (
                <FileTypeIcon fileName={entry.name} className="size-8 shrink-0 drop-shadow-xs" />
              )}
              <div className="min-w-0">
                <DrawerHeading className="truncate text-base font-bold text-foreground">
                  {entry.name}
                </DrawerHeading>
                <div className="flex items-center gap-2 mt-0.5">
                  <Chip className="bg-primary/10 text-primary font-medium text-[11px] h-5 px-1.5">
                    {isFolder ? t("infoFolder") : (typeLabel ?? t("infoFile"))}
                  </Chip>
                </div>
              </div>
            </div>
            <DrawerCloseTrigger className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              ✕
            </DrawerCloseTrigger>
          </DrawerHeader>
          <DrawerBody className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar">
            <div className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-3 shadow-xs">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                المعلومات والخصائص
              </h4>
              <dl className="divide-y divide-border/40">
                {!isFolder && size ? (
                  <InfoRow label={t("infoSize")} value={<span className="font-semibold">{size}</span>} />
                ) : null}
                {!isFolder && typeLabel ? (
                  <InfoRow label={t("infoType")} value={typeLabel} />
                ) : null}
                <InfoRow
                  label={t("infoLocation")}
                  value={<span className="break-all font-mono text-xs">{location}</span>}
                />
                <InfoRow
                  label={t("infoPath")}
                  value={<span className="break-all font-mono text-xs">{entry.path}</span>}
                />
                {created ? (
                  <InfoRow label={t("infoCreated")} value={created} />
                ) : null}
                {modified ? (
                  <InfoRow label={t("infoModified")} value={modified} />
                ) : null}
                {!isFolder && entry.etag ? (
                  <InfoRow
                    label="ETag"
                    value={
                      <span className="break-all font-mono text-xs text-muted-foreground">
                        {entry.etag.replace(/"/g, "")}
                      </span>
                    }
                  />
                ) : null}
              </dl>
            </div>
          </DrawerBody>
          <DrawerFooter className="border-t border-border/60 pt-4 flex items-center justify-end gap-2">
            <Button type="button" onClick={() => onOpenChangeAction(false)}>
              {tc("done")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      ) : null}
    </Drawer>
  )
}

export function DeleteEntriesDialog({
  error,
  isPending,
  progress,
  onOpenChangeAction,
  onSubmitAction,
  targets,
}: {
  error: string | null
  isPending: boolean
  progress?: BulkProgress | null
  onOpenChangeAction: (open: boolean) => void
  onSubmitAction: () => void
  targets: FileSystemEntry[]
}) {
  const t = useTranslations("Dialogs")
  const tc = useTranslations("Common")
  const open = targets.length > 0

  return (
    <Modal open={open} onOpenChange={onOpenChangeAction}>
      {open ? (
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>
              {targets.length > 1
                ? t("deleteItemsTitle", { count: targets.length })
                : targets[0].kind === "folder"
                  ? t("deleteFolderTitle")
                  : t("deleteFileTitle")}
            </ModalTitle>
            <ModalDescription>
              {targets.length > 1
                ? t("deleteItemsDescription", { count: targets.length })
                : targets[0].kind === "folder"
                  ? t("deleteFolderDescription", { name: targets[0].name })
                  : t("deleteFileDescription", { name: targets[0].name })}
            </ModalDescription>
          </ModalHeader>
          {error || progress ? (
            <ModalPanel className="space-y-2">
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              {progress ? (
                <BulkProgressBar verb={t("deleting")} progress={progress} />
              ) : null}
            </ModalPanel>
          ) : null}
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChangeAction(false)}
            >
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={isPending}
              onClick={onSubmitAction}
            >
              {tc("delete")}
            </Button>
          </ModalFooter>
        </ModalContent>
      ) : null}
    </Modal>
  )
}

const SHARE_EXPIRY_OPTIONS = [
  { labelKey: "shareExpiry5m" as const, value: 300 },
  { labelKey: "shareExpiry15m" as const, value: 900 },
  { labelKey: "shareExpiry1h" as const, value: 3600 },
  { labelKey: "shareExpiry6h" as const, value: 21600 },
  { labelKey: "shareExpiry24h" as const, value: 86400 },
]

export function ShareFileDialog({
  file,
  onOpenChangeAction,
  onShareAction,
}: {
  file: FileSystemFileItem | null
  onOpenChangeAction: (open: boolean) => void
  onShareAction: (
    file: FileSystemFileItem,
    expiresIn: number
  ) => Promise<string>
}) {
  const t = useTranslations("Dialogs")
  const tc = useTranslations("Common")
  const open = file !== null
  const [expiresIn, setExpiresIn] = React.useState(3600)
  const [shareUrl, setShareUrl] = React.useState<string | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)

  // Reset state when dialog opens for a new file
  const prevFileKey = React.useRef<string | null>(null)
  const fileKey = file ? (file.key ?? file.path) : null
  if (fileKey !== prevFileKey.current) {
    prevFileKey.current = fileKey
    if (file) {
      setShareUrl(null)
      setExpiresIn(3600)
      setIsCreating(false)
    }
  }

  async function handleCreate() {
    if (!file) return
    setIsCreating(true)
    try {
      const url = await onShareAction(file, expiresIn)
      setShareUrl(url)
    } catch {
      toast.error(t("shareError"))
    } finally {
      setIsCreating(false)
    }
  }

  async function handleCopy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success(t("shareCopied"))
    } catch {
      toast.error(t("shareCopyError"))
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChangeAction}>
      {file ? (
        <ModalContent className="max-w-md">
          <ModalHeader>
            <div className="flex items-center gap-3">
              <FileTypeIcon fileName={file.name ?? file.path} className="size-7" />
              <div className="min-w-0">
                <ModalTitle className="truncate text-left">
                  {t("shareFileTitle")}
                </ModalTitle>
                <ModalDescription className="text-left">
                  {t("shareDescription", { name: file.name ?? file.path })}
                </ModalDescription>
              </div>
            </div>
          </ModalHeader>
          <ModalPanel>
            {shareUrl ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("shareLinkLabel")}</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="min-w-0 flex-1 font-mono text-xs"
                  />
                  <Button type="button" variant="outline" onClick={handleCopy}>
                    {t("shareCopy")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("shareExpiry")}</p>
                <Select
                  value={expiresIn}
                  onValueChange={(v) => setExpiresIn(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(() => {
                        const opt = SHARE_EXPIRY_OPTIONS.find(
                          (o) => o.value === expiresIn
                        )
                        return opt ? t(opt.labelKey) : null
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SHARE_EXPIRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </ModalPanel>
          <ModalFooter>
            {shareUrl ? (
              <Button type="button" onClick={() => onOpenChangeAction(false)}>
                {tc("done")}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isCreating}
                  onClick={() => onOpenChangeAction(false)}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  type="button"
                  loading={isCreating}
                  onClick={() => void handleCreate()}
                >
                  <AppIcon icon={Share08Icon} />
                  {isCreating ? t("shareCreating") : t("shareCreateLink")}
                </Button>
              </>
            )}
          </ModalFooter>
        </ModalContent>
      ) : null}
    </Modal>
  )
}
