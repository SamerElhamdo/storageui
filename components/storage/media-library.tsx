"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"

import { toConnectionRef } from "@/lib/storage/connection-ref"
import type { Connection } from "@/lib/storage/connections"
import type {
  MediaBootstrap,
  MediaListItem,
  MediaSummary,
} from "@/lib/storage/media"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { ImageThumbnailPreview } from "@/components/explorer/image-thumbnail-preview"
import type { FileSystemFileItem } from "@/components/explorer/types"
import { AppIcon, Image01Icon, PlayIcon } from "@/components/foundations/icons"
import { NEUTRAL_BADGE_CLASSNAME } from "@/components/storage/badge-styles"
import { FileViewerDialog } from "@/components/storage/file-viewer-dialog"
import { listMediaAction, mediaSummaryAction } from "@/app/actions/files"

type MediaLibraryProps = {
  connection: Connection | null
  connectionName?: string
  headerLeading?: React.ReactNode
  thumbnailHandle?: string | null
  getFileUrl?: (file: FileSystemFileItem) => Promise<string>
  onOpenAction?: (file: FileSystemFileItem, url: string | null) => void
  isStarredAction?: (key: string) => boolean
  onToggleStarAction?: (file: FileSystemFileItem) => void
  initialMedia?: MediaBootstrap | null
}

function toFile(item: MediaListItem): FileSystemFileItem {
  return {
    kind: "file",
    path: item.path,
    key: item.key,
    name: item.name,
    contentType: item.contentType,
    size: item.size,
    updatedAt: item.updatedAt,
    etag: item.etag,
  }
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  const units = ["KB", "MB", "GB", "TB"]
  let value = size / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = value >= 10 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unit]}`
}

function dayKey(iso: string | undefined): string {
  if (!iso) return "unknown"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "unknown"
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${rest.toString().padStart(2, "0")}`
}

function ContentsChart({ summary }: { summary: MediaSummary }) {
  const t = useTranslations("Media")
  const rows = [
    {
      key: "image" as const,
      label: t("images"),
      bar: "bg-foreground/70",
      ...summary.image,
    },
    {
      key: "video" as const,
      label: t("videos"),
      bar: "bg-foreground/45",
      ...summary.video,
    },
    {
      key: "other" as const,
      label: t("other"),
      bar: "bg-foreground/25",
      ...summary.other,
    },
  ]
  const maxBytes = Math.max(...rows.map((row) => row.bytes), 1)

  return (
    <section
      aria-label={t("contents")}
      className="shrink-0 px-3 pt-2.5 pb-2"
      data-media-summary={`${summary.image.count}:${summary.video.count}:${summary.other.count}`}
    >
      <div className="mb-1.5 flex min-w-0 items-baseline gap-2">
        <h2 className="shrink-0 text-xs text-muted-foreground">
          {t("contents")}
        </h2>
        <p
          className="min-w-0 truncate text-[11px] text-muted-foreground/70"
          title={t("contentsHint")}
        >
          {t("contentsHint")}
        </p>
      </div>
      <ul
        className="grid gap-x-5 gap-y-1.5"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(11.5rem, 1fr))",
        }}
      >
        {rows.map((row) => (
          <li key={row.key} className="min-w-0">
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px] leading-none">
              <span className="truncate text-muted-foreground">
                {row.label}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {t("fileCount", { count: row.count })}
                <span aria-hidden className="px-1 text-muted-foreground/40">
                  ·
                </span>
                {formatBytes(row.bytes)}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", row.bar)}
                style={{
                  width:
                    row.bytes === 0
                      ? "0%"
                      : `${Math.max(4, (row.bytes / maxBytes) * 100)}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

const tileGridStyle = {
  gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
} as const

function MediaGridSkeleton() {
  const t = useTranslations("Media")

  return (
    <div className="px-2 py-1" aria-busy="true">
      <div className="flex items-baseline justify-between px-1 py-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-10" />
      </div>
      <div className="grid items-start gap-0.5" style={tileGridStyle}>
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton key={index} className="aspect-square rounded-none" />
        ))}
      </div>
      <span className="sr-only">{t("loading")}</span>
    </div>
  )
}

type MediaTileProps = {
  item: MediaListItem
  index: number
  connectionId?: string
  thumbnailHandle?: string | null
  getFileUrl?: (file: FileSystemFileItem) => Promise<string>
  urlCache: Map<string, string>
  onOpen: (index: number) => void
  playLabel: string
}

function MediaTile({
  item,
  index,
  connectionId,
  thumbnailHandle,
  getFileUrl,
  urlCache,
  onOpen,
  playLabel,
}: MediaTileProps) {
  const [phase, setPhase] = React.useState<"pending" | "ready" | "error">(
    "pending"
  )
  const [revealed, setRevealed] = React.useState(false)
  const isImage = item.kind === "image" && Boolean(getFileUrl)
  const arrived = revealed || phase === "error"
  const stagger = `${(index % 6) * 40}ms`

  React.useEffect(() => {
    if (isImage) return
    setPhase("ready")
  }, [isImage, item.key])

  React.useEffect(() => {
    if (phase !== "ready") return
    const frame = requestAnimationFrame(() => setRevealed(true))
    return () => cancelAnimationFrame(frame)
  }, [phase, item.key])

  const onPreviewSettle = React.useCallback((status: "ready" | "error") => {
    if (status === "error") {
      setPhase("error")
      setRevealed(true)
      return
    }
    setPhase((current) => (current === "error" ? current : "ready"))
  }, [])

  return (
    <button
      type="button"
      data-media-key={item.key}
      data-media-kind={item.kind}
      onClick={() => onOpen(index)}
      className="group relative aspect-square min-w-0 overflow-hidden bg-muted text-start outline-none focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 origin-center transition-[filter,transform] duration-700 ease-out motion-reduce:scale-100 motion-reduce:blur-none motion-reduce:transition-none",
          arrived
            ? "scale-100 blur-none"
            : "scale-[0.96] blur-md motion-reduce:scale-100 motion-reduce:blur-none",
          phase === "error" && "transition-none"
        )}
        style={
          arrived && phase !== "error"
            ? { transitionDelay: stagger }
            : undefined
        }
      >
        {isImage && getFileUrl ? (
          <ImageThumbnailPreview
            cacheKey={`${connectionId ?? ""}\u0000${item.path}`}
            file={toFile(item)}
            getFileUrl={getFileUrl}
            urlCache={urlCache}
            thumbnailHandle={thumbnailHandle}
            widthHint={160}
            onPreviewSettle={onPreviewSettle}
          />
        ) : (
          <span className="block size-full bg-neutral-950" />
        )}
      </span>
      <span className="pointer-events-none absolute inset-x-0 top-0 z-[1] bg-gradient-to-b from-black/80 via-black/45 to-transparent px-1.5 pt-1 pb-5 text-[11px] leading-tight font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100 motion-reduce:transition-none">
        <span className="line-clamp-2 [overflow-wrap:anywhere]">
          {item.name}
        </span>
      </span>
      {item.kind === "video" && arrived ? (
        <span className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center text-white motion-reduce:transition-none">
          <span className="flex size-9 items-center justify-center rounded-full bg-white/15">
            <AppIcon
              icon={PlayIcon}
              className="size-5 fill-current"
              aria-hidden
            />
          </span>
          <span className="sr-only">{playLabel}</span>
        </span>
      ) : null}
      {item.kind === "video" && arrived && item.durationSeconds ? (
        <span className="pointer-events-none absolute right-1 bottom-1 z-[1] rounded bg-black/75 px-1 py-0.5 text-[11px] font-medium text-white tabular-nums">
          {formatDuration(item.durationSeconds)}
        </span>
      ) : null}
    </button>
  )
}

export function MediaLibrary({
  connection,
  connectionName,
  headerLeading,
  thumbnailHandle,
  getFileUrl,
  onOpenAction,
  isStarredAction,
  onToggleStarAction,
  initialMedia = null,
}: MediaLibraryProps) {
  const t = useTranslations("Media")
  const locale = useLocale()
  const dateLocale = locale === "zh" ? "zh-CN" : "en-US"
  const [items, setItems] = React.useState<MediaListItem[]>(
    initialMedia?.page.items ?? []
  )
  const [cursor, setCursor] = React.useState<string | null>(
    initialMedia?.page.nextCursor ?? null
  )
  const [summary, setSummary] = React.useState<MediaSummary | null>(
    initialMedia?.summary ?? null
  )
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const loadedFor = React.useRef<string | null>(
    initialMedia?.connectionId ?? null
  )
  const loadingMoreRef = React.useRef(false)
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const urlCache = React.useMemo(() => new Map<string, string>(), [])
  const [viewerIndex, setViewerIndex] = React.useState<number | null>(null)
  const [viewerUrl, setViewerUrl] = React.useState<string | null>(null)
  const [viewerPreview, setViewerPreview] = React.useState<string | null>(null)
  const [viewerLoading, setViewerLoading] = React.useState(false)
  const viewerRequest = React.useRef(0)

  React.useEffect(() => {
    if (!connection) return
    if (loadedFor.current === connection.id) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setItems([])
    setCursor(null)
    setSummary(null)
    const ref = toConnectionRef(connection)
    Promise.all([listMediaAction(ref, null), mediaSummaryAction(ref)])
      .then(([page, nextSummary]) => {
        if (cancelled) return
        loadedFor.current = connection.id
        setItems(page.items)
        setCursor(page.nextCursor)
        setSummary(nextSummary)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setItems([])
        setCursor(null)
        setSummary(null)
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [connection])

  const loadMore = React.useCallback(() => {
    if (!connection || !cursor || loadingMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    const ref = toConnectionRef(connection)
    listMediaAction(ref, cursor)
      .then((page) => {
        setItems((current) => [...current, ...page.items])
        setCursor(page.nextCursor)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        loadingMoreRef.current = false
        setLoadingMore(false)
      })
  }, [connection, cursor])

  React.useEffect(() => {
    const root = scrollerRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel || !cursor) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore()
      },
      { root, rootMargin: "480px" }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [cursor, loadMore])

  const groups = React.useMemo(() => {
    const order: string[] = []
    const byDay = new Map<string, MediaListItem[]>()
    for (const item of items) {
      const key = dayKey(item.updatedAt)
      const group = byDay.get(key)
      if (group) group.push(item)
      else {
        byDay.set(key, [item])
        order.push(key)
      }
    }
    return order.map((key) => ({ key, items: byDay.get(key) ?? [] }))
  }, [items])

  const labelFor = React.useCallback(
    (iso: string | undefined) => {
      if (!iso) return t("unknownDay")
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return t("unknownDay")
      const diff = Math.round(
        (startOfDay(new Date()) - startOfDay(date)) / 86_400_000
      )
      if (diff === 0) return t("today")
      if (diff === 1) return t("yesterday")
      return date.toLocaleDateString(dateLocale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    },
    [dateLocale, t]
  )

  const openAt = React.useCallback(
    (index: number) => {
      const item = items[index]
      if (!item) return
      const request = ++viewerRequest.current
      const file = toFile(item)
      const shown = document.querySelector(
        `[data-media-key="${CSS.escape(item.key)}"] img`
      )
      const preview =
        item.kind === "image" && shown instanceof HTMLImageElement
          ? shown.currentSrc || shown.src || null
          : null
      setViewerIndex(index)
      setViewerPreview(preview)
      setViewerUrl(null)
      setViewerLoading(true)
      onOpenAction?.(file, null)
      const finish = (url: string | null) => {
        if (viewerRequest.current !== request) return
        setViewerUrl(url)
        setViewerLoading(false)
      }
      if (!getFileUrl) {
        finish(null)
        return
      }
      void getFileUrl(file).then(finish, () => finish(null))
    },
    [getFileUrl, items, onOpenAction]
  )

  const viewerItem = viewerIndex !== null ? items[viewerIndex] : null

  const titleName = connection?.name ?? connectionName

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
        {headerLeading}
        <span className="text-sm font-medium">{t("title")}</span>
        {titleName ? (
          <Badge
            variant="outline"
            className={cn(NEUTRAL_BADGE_CLASSNAME, "truncate text-sm")}
          >
            {titleName}
          </Badge>
        ) : null}
      </div>

      {summary ? <ContentsChart summary={summary} /> : null}

      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <h2 className="text-base font-semibold">{t("loadError")}</h2>
            <p className="max-w-md text-sm text-muted-foreground">{error}</p>
          </div>
        ) : loading && items.length === 0 ? (
          <MediaGridSkeleton />
        ) : items.length === 0 ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <AppIcon icon={Image01Icon} className="size-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold">{t("emptyTitle")}</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t("emptyDescription")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-2 py-1" data-media-count={items.length}>
            {groups.map((group) => (
              <section key={group.key}>
                <div className="sticky top-0 z-20 -mb-3">
                  <div className="flex items-baseline justify-between gap-3 bg-background px-1 pt-2.5 pb-1">
                    <h3 className="text-sm font-semibold tracking-tight">
                      {labelFor(group.items[0]?.updatedAt)}
                    </h3>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t("dayCount", { count: group.items.length })}
                    </span>
                  </div>
                  <div
                    aria-hidden
                    className="pointer-events-none h-3 bg-gradient-to-b from-background to-transparent"
                  />
                </div>
                <div className="grid items-start gap-0.5" style={tileGridStyle}>
                  {group.items.map((item) => {
                    const index = items.indexOf(item)
                    return (
                      <MediaTile
                        key={item.key}
                        item={item}
                        index={index}
                        connectionId={connection?.id}
                        thumbnailHandle={thumbnailHandle}
                        getFileUrl={getFileUrl}
                        urlCache={urlCache}
                        onOpen={openAt}
                        playLabel={t("play")}
                      />
                    )
                  })}
                </div>
              </section>
            ))}
            {cursor ? (
              <div
                ref={sentinelRef}
                className="flex h-10 items-center justify-center"
              >
                {loadingMore ? (
                  <Spinner
                    className="size-3.5 text-muted-foreground"
                    aria-label={t("loadingMore")}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
      <FileViewerDialog
        file={viewerItem ? toFile(viewerItem) : null}
        url={viewerUrl}
        previewUrl={viewerPreview}
        loading={viewerLoading}
        open={viewerIndex !== null}
        onOpenChangeAction={(next) => {
          if (!next) {
            viewerRequest.current += 1
            setViewerIndex(null)
            setViewerUrl(null)
            setViewerPreview(null)
            setViewerLoading(false)
          }
        }}
        hasPrevious={viewerIndex !== null && viewerIndex > 0}
        hasNext={viewerIndex !== null && viewerIndex < items.length - 1}
        onPreviousAction={
          viewerIndex !== null ? () => openAt(viewerIndex - 1) : undefined
        }
        onNextAction={
          viewerIndex !== null ? () => openAt(viewerIndex + 1) : undefined
        }
        isStarred={
          viewerItem ? (isStarredAction?.(viewerItem.key) ?? false) : false
        }
        onToggleStarAction={
          viewerItem && onToggleStarAction
            ? () => onToggleStarAction(toFile(viewerItem))
            : undefined
        }
      />
    </div>
  )
}
