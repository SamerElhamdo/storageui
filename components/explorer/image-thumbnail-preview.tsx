"use client"

import * as React from "react"

import {
  DEFAULT_THUMBNAIL_WIDTH,
  thumbnailUrl,
  thumbnailWidthForTile,
} from "@/lib/storage/thumbnails"
import { FileTypeIcon } from "@/components/explorer/internals"
import type { FileSystemFileItem } from "@/components/explorer/types"

type ImageThumbnailPreviewProps = {
  cacheKey: string
  file: FileSystemFileItem
  getFileUrl: (file: FileSystemFileItem) => string | Promise<string>
  urlCache: Map<string, string>
  /** `null` falls back to the presigned original. */
  thumbnailHandle?: string | null
  /** Rendered width in CSS px. */
  widthHint?: number
  /**
   * Fires when the preview image has decoded, or when preview has given up.
   * A failed thumbnail that falls back to the original does not settle yet.
   */
  onPreviewSettle?: (status: "ready" | "error") => void
}

function usePreviewSettle(
  onPreviewSettle?: (status: "ready" | "error") => void
) {
  const ref = React.useRef(onPreviewSettle)
  ref.current = onPreviewSettle
  return React.useCallback((status: "ready" | "error") => {
    ref.current?.(status)
  }, [])
}

function previewImageProps(settle: (status: "ready" | "error") => void) {
  return {
    onLoad: () => settle("ready"),
    ref: (node: HTMLImageElement | null) => {
      // Cached and data URLs can be decoded before onLoad is attached.
      if (node?.complete && node.naturalWidth > 0) settle("ready")
    },
  }
}

export function ImageThumbnailPreview({
  cacheKey,
  file,
  getFileUrl,
  urlCache,
  thumbnailHandle,
  widthHint,
  onPreviewSettle,
}: ImageThumbnailPreviewProps) {
  const settle = usePreviewSettle(onPreviewSettle)
  const [thumbnailFailed, setThumbnailFailed] = React.useState(false)

  const width = widthHint
    ? thumbnailWidthForTile(widthHint)
    : DEFAULT_THUMBNAIL_WIDTH
  const objectKey = file.key ?? file.path

  const serverThumbnail =
    thumbnailHandle && !thumbnailFailed
      ? thumbnailUrl(thumbnailHandle, objectKey, width, file.etag)
      : null

  React.useEffect(() => {
    setThumbnailFailed(false)
  }, [thumbnailHandle])

  if (serverThumbnail) {
    return (
      <img
        src={serverThumbnail}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
        {...previewImageProps(settle)}
        onError={() => setThumbnailFailed(true)}
      />
    )
  }

  return (
    <OriginalImagePreview
      cacheKey={cacheKey}
      file={file}
      getFileUrl={getFileUrl}
      urlCache={urlCache}
      onPreviewSettle={onPreviewSettle}
    />
  )
}

function FileGlyph({ file }: { file: FileSystemFileItem }) {
  return (
    <div className="flex size-full items-center justify-center bg-white dark:bg-neutral-100">
      <FileTypeIcon
        fileName={file.name ?? file.path}
        className="size-1/3 min-h-4 min-w-4"
      />
    </div>
  )
}

function OriginalImagePreview({
  cacheKey,
  file,
  getFileUrl,
  urlCache,
  onPreviewSettle,
}: Pick<
  ImageThumbnailPreviewProps,
  "cacheKey" | "file" | "getFileUrl" | "urlCache" | "onPreviewSettle"
>) {
  const settle = usePreviewSettle(onPreviewSettle)
  const knownUrl = file.url ?? urlCache.get(cacheKey) ?? null
  const [url, setUrl] = React.useState<string | null>(knownUrl)
  const [failed, setFailed] = React.useState(false)

  const fileRef = React.useRef(file)
  React.useEffect(() => {
    fileRef.current = file
  })

  const filePath = file.path
  const fileUrl = file.url ?? null

  // Keyed by path, not object identity: the manifest re-creates file objects,
  // and re-running on identity would duplicate an in-flight presign.
  React.useEffect(() => {
    const cachedUrl = fileUrl ?? urlCache.get(cacheKey) ?? null
    if (cachedUrl) {
      setUrl(cachedUrl)
      setFailed(false)
      return
    }

    let isCurrent = true
    setUrl(null)
    setFailed(false)

    void Promise.resolve(getFileUrl(fileRef.current))
      .then((nextUrl) => {
        if (!nextUrl) throw new Error("No preview URL")
        urlCache.set(cacheKey, nextUrl)
        if (isCurrent) setUrl(nextUrl)
      })
      .catch(() => {
        if (isCurrent) setFailed(true)
      })

    return () => {
      isCurrent = false
    }
  }, [cacheKey, filePath, fileUrl, getFileUrl, urlCache])

  React.useEffect(() => {
    if (failed) settle("error")
  }, [failed, settle])

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
        {...previewImageProps(settle)}
        onError={() => {
          urlCache.delete(cacheKey)
          setFailed(true)
        }}
      />
    )
  }

  if (!failed) {
    return (
      <div
        aria-hidden="true"
        className={
          onPreviewSettle
            ? "size-full bg-muted"
            : "size-full animate-pulse bg-muted motion-reduce:animate-none"
        }
      />
    )
  }

  return <FileGlyph file={file} />
}
