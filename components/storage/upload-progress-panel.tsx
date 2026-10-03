"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Card, CardHeader, CardContent, Chip, ProgressBar } from "@heroui/react"

import type { UploadTask } from "@/lib/storage/hooks/use-uploads"
import { cn } from "@/lib/utils"
import { formatByteSize } from "@/components/explorer/internals"
import {
  AppIcon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  File01Icon,
} from "@/components/foundations/icons"

export function UploadProgressPanel({
  tasks,
  activeCount,
  onDismissAction,
  onClearAction,
}: {
  tasks: UploadTask[]
  activeCount: number
  onDismissAction: (id: string) => void
  onClearAction: () => void
}) {
  const t = useTranslations("Upload")
  if (tasks.length === 0) return null

  const allDone = activeCount === 0
  const title =
    activeCount > 0 ? t("uploading", { count: activeCount }) : t("complete")

  return (
    <div className="fixed right-4 bottom-4 z-50 w-84 max-w-[calc(100vw-2rem)]">
      <Card className="border border-border/80 bg-background/95 shadow-xl backdrop-blur-md dark:bg-background/90">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-sm font-semibold">{title}</span>
            {activeCount > 0 ? (
              <Chip className="bg-primary/10 text-primary font-medium text-[11px] h-5 px-1.5">
                {activeCount}
              </Chip>
            ) : (
              <Chip className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[11px] h-5 px-1.5">
                {t("complete")}
              </Chip>
            )}
          </div>
          <button
            type="button"
            onClick={onClearAction}
            disabled={!allDone}
            className={cn(
              "rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none",
              !allDone && "pointer-events-none opacity-40"
            )}
            aria-label={t("dismissCompleted")}
          >
            <AppIcon icon={Cancel01Icon} className="size-4" />
          </button>
        </CardHeader>

        <CardContent className="max-h-72 overflow-y-auto p-2 no-scrollbar">
          <ul className="space-y-1">
            {tasks.map((task) => {
              const pct =
                task.total > 0
                  ? Math.min(100, Math.round((task.loaded / task.total) * 100))
                  : task.status === "done"
                    ? 100
                    : 0
              const size =
                task.status === "uploading"
                  ? `${formatByteSize(task.loaded)} / ${formatByteSize(task.total)}`
                  : formatByteSize(task.total)
              return (
                <li key={task.id} className="rounded-lg p-2 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <AppIcon
                      icon={
                        task.status === "done"
                          ? CheckmarkCircle01Icon
                          : task.status === "error"
                            ? CancelCircleIcon
                            : File01Icon
                      }
                      className={cn(
                        "size-4 shrink-0",
                        task.status === "done" && "text-emerald-500",
                        task.status === "error" && "text-destructive",
                        task.status === "uploading" && "text-primary animate-pulse"
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                      {task.name}
                    </span>
                    {task.status === "uploading" ? (
                      <span className="shrink-0 text-xs font-semibold text-primary tabular-nums">
                        {pct}%
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onDismissAction(task.id)}
                        className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={t("dismiss")}
                      >
                        <AppIcon icon={Cancel01Icon} className="size-3.5" />
                      </button>
                    )}
                  </div>
                  {task.status === "uploading" ? (
                    <div className="mt-2 pl-6">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all duration-300 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                  {size ? (
                    <p className="mt-1 pl-6 text-[11px] text-muted-foreground tabular-nums">
                      {size}
                    </p>
                  ) : null}
                  {task.status === "error" && task.error ? (
                    <p className="mt-1 pl-6 text-xs text-destructive">
                      {task.error}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
