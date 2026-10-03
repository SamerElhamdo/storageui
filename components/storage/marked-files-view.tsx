"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, Chip, Button as HeroUIButton } from "@heroui/react"

import type { MarkedFile } from "@/lib/store/file-marks-store"
import { cn } from "@/lib/utils"
import {
  FileSystemIconSpriteSheet,
  FileTypeIcon,
} from "@/components/explorer/file-system"
import {
  AppIcon,
  Clock01Icon,
  Delete02Icon,
  FavouriteIcon,
} from "@/components/foundations/icons"

type MarkedFilesViewProps = {
  section: "recents" | "starred"
  connectionName: string
  headerLeading?: React.ReactNode
  files: MarkedFile[]
  isStarredAction: (key: string) => boolean
  onOpenAction: (file: MarkedFile) => void
  onToggleStarAction: (file: MarkedFile) => void
  onClearRecentsAction?: () => void
  showFileExtensions: boolean
}

function basename(path: string) {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path
  const index = trimmed.lastIndexOf("/")
  return index === -1 ? trimmed : trimmed.slice(index + 1)
}

function displayName(file: MarkedFile, showFileExtensions: boolean) {
  const name = file.name ?? basename(file.path)
  if (showFileExtensions) return name
  const dotIndex = name.lastIndexOf(".")
  return dotIndex <= 0 ? name : name.slice(0, dotIndex)
}

function formatSize(size: number | undefined) {
  if (size === undefined) return null
  if (size < 1024) return `${size} B`
  const units = ["KB", "MB", "GB", "TB"]
  let value = size / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unitIndex]}`
}

function formatDate(iso: string | undefined) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function metaLine(file: MarkedFile) {
  return [formatSize(file.size), formatDate(file.updatedAt)]
    .filter(Boolean)
    .join(" · ")
}

export function MarkedFilesView({
  section,
  connectionName,
  headerLeading,
  files,
  isStarredAction,
  onOpenAction,
  onToggleStarAction,
  onClearRecentsAction,
  showFileExtensions,
}: MarkedFilesViewProps) {
  const t = useTranslations("Marked")
  return (
    <div className="flex h-full min-h-0 flex-col bg-background/50">
      <FileSystemIconSpriteSheet />
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/80 px-4 bg-muted/30">
        <div className="flex min-w-0 items-center gap-2.5">
          {headerLeading}
          <div className="flex items-center gap-2">
            <AppIcon
              icon={section === "recents" ? Clock01Icon : FavouriteIcon}
              className="size-4 text-primary"
            />
            <span className="text-sm font-semibold">{t(section)}</span>
          </div>
          <Chip className="bg-primary/10 text-primary font-medium text-xs px-2 h-6">
            {connectionName}
          </Chip>
          <Chip className="bg-muted text-muted-foreground font-medium text-xs px-2 h-6">
            {files.length}
          </Chip>
        </div>
        {section === "recents" && files.length > 0 ? (
          <button
            type="button"
            onClick={onClearRecentsAction}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive outline-none"
          >
            <AppIcon icon={Delete02Icon} className="size-3.5" />
            {t("clearRecents")}
          </button>
        ) : null}
      </div>

      {files.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <AppIcon
              icon={section === "recents" ? Clock01Icon : FavouriteIcon}
              className="size-7"
            />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h2 className="text-base font-semibold text-foreground">
              {section === "recents" ? t("noRecents") : t("noStarred")}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {section === "recents" ? t("recentsHint") : t("starredHint")}
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {files.map((file) => {
              const starred = isStarredAction(file.key)
              return (
                <Card
                  key={file.key}
                  className="group relative flex flex-row items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => onOpenAction(file)}
                >
                  <FileTypeIcon
                    fileName={file.name ?? basename(file.path)}
                    className="size-9 shrink-0 drop-shadow-xs"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {displayName(file, showFileExtensions)}
                    </p>
                    {metaLine(file) ? (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {metaLine(file)}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label={starred ? t("unstar") : t("star")}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleStarAction(file)
                    }}
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors outline-none",
                      starred
                        ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                        : "text-muted-foreground/40 hover:text-amber-500 hover:bg-muted"
                    )}
                  >
                    <AppIcon
                      icon={FavouriteIcon}
                      className={cn("size-4", starred && "fill-amber-500")}
                    />
                  </button>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
