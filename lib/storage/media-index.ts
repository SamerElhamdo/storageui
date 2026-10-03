import "server-only"

import { createHash } from "node:crypto"

import { getFileKind } from "@/lib/file-kind"
import type { ConnectionRef } from "@/lib/storage/connection-ref"
import { resolveFiles } from "@/lib/storage/connections-server"
import { normalizeError } from "@/lib/storage/file-operations"
import {
  MEDIA_PAGE_SIZE,
  type MediaListItem,
  type MediaPageResult,
  type MediaSummary,
} from "@/lib/storage/media"
import type { FileSystemFileItem } from "@/components/explorer/types"

/**
 * One walk of the bucket fills both the chart aggregate and a lightweight index
 * of image/video keys. Held in server memory for a few minutes per connection so
 * scrolling the grid (and reopening the chart) does not list the bucket again.
 *
 * The grid action only slices this index. It does not call `listAll` per page.
 */
const CACHE_TTL_MS = 3 * 60 * 1000

type MediaIndex = {
  expiresAt: number
  summary: MediaSummary
  media: MediaListItem[]
}

const cache = new Map<string, MediaIndex>()
const inflight = new Map<string, Promise<MediaIndex>>()

function emptySummary(): MediaSummary {
  return {
    image: { count: 0, bytes: 0 },
    video: { count: 0, bytes: 0 },
    other: { count: 0, bytes: 0 },
  }
}

function cacheKey(ref: ConnectionRef): string {
  if (ref.source === "env") return `env:${ref.id}`
  const connection = ref.connection
  const fingerprint = createHash("sha256")
    .update(
      [
        connection.provider,
        connection.bucket,
        connection.endpoint ?? "",
        connection.region ?? "",
        connection.accessKeyId,
        connection.secretAccessKey,
        connection.root ?? "",
      ].join("\0")
    )
    .digest("hex")
  return `local:${fingerprint}`
}

function parseOffset(cursor: string | null): number {
  if (!cursor) return 0
  const offset = Number(cursor)
  if (!Number.isSafeInteger(offset) || offset < 0) return 0
  return offset
}

async function scan(ref: ConnectionRef): Promise<MediaIndex> {
  const files = resolveFiles(ref)
  const summary = emptySummary()
  const media: MediaListItem[] = []

  try {
    for await (const file of files.listAll()) {
      if (!file.key || file.key.endsWith("/")) continue
      const size = file.size ?? 0
      const item: FileSystemFileItem = {
        kind: "file",
        path: file.key,
        key: file.key,
        name: file.name || file.key.slice(file.key.lastIndexOf("/") + 1),
        contentType: file.type || undefined,
        size,
        updatedAt: file.lastModified
          ? new Date(file.lastModified).toISOString()
          : undefined,
        etag: file.etag,
      }
      const kind = getFileKind(item)
      const group =
        kind === "image" ? "image" : kind === "video" ? "video" : "other"
      summary[group].count += 1
      summary[group].bytes += size
      if (group === "other") continue
      media.push({
        path: item.path,
        key: file.key,
        name: item.name ?? file.key,
        contentType: item.contentType,
        size,
        updatedAt: item.updatedAt,
        etag: item.etag,
        kind: group,
      })
    }
  } catch (error) {
    throw normalizeError(error)
  }

  media.sort((a, b) => {
    const byDate = (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")
    if (byDate !== 0) return byDate
    return a.key.localeCompare(b.key)
  })

  return { expiresAt: Date.now() + CACHE_TTL_MS, summary, media }
}

async function getIndex(ref: ConnectionRef): Promise<MediaIndex> {
  const key = cacheKey(ref)
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return hit

  const running = inflight.get(key)
  if (running) return running

  const job = scan(ref)
    .then((entry) => {
      cache.set(key, entry)
      return entry
    })
    .finally(() => {
      inflight.delete(key)
    })
  inflight.set(key, job)
  return job
}

/** One page of images and videos, newest `updatedAt` first. */
export async function listMediaPage(
  ref: ConnectionRef,
  cursor: string | null
): Promise<MediaPageResult> {
  const index = await getIndex(ref)
  const offset = parseOffset(cursor)
  const items = index.media.slice(offset, offset + MEDIA_PAGE_SIZE)
  const next = offset + items.length
  return {
    items,
    nextCursor: next < index.media.length ? String(next) : null,
  }
}

/** Bytes and counts for images, video, and everything else. */
export async function mediaSummary(ref: ConnectionRef): Promise<MediaSummary> {
  const index = await getIndex(ref)
  return index.summary
}
