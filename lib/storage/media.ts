/** Shared media-library types. Safe to import from client components. */

export const MEDIA_PAGE_SIZE = 12

export type MediaCounts = {
  count: number
  bytes: number
}

/** Whole-bucket contents. Not a quota — this app has no bucket capacity. */
export type MediaSummary = {
  image: MediaCounts
  video: MediaCounts
  other: MediaCounts
}

export type MediaListItem = {
  path: string
  key: string
  name: string
  contentType?: string
  size: number
  updatedAt?: string
  etag?: string
  kind: "image" | "video"
  /** Playable length in seconds, when the listing knows it. */
  durationSeconds?: number
}

export type MediaPageResult = {
  items: MediaListItem[]
  nextCursor: string | null
}

/** First page rendered on the server for the dev mock bucket. */
export type MediaBootstrap = {
  connectionId: string
  connectionName: string
  page: MediaPageResult
  summary: MediaSummary
}
