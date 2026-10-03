import "server-only"

import type { StoredFile } from "files-sdk"

import { MOCK_CONNECTION_ID } from "@/lib/storage/connections"
import type { FilesClient } from "@/lib/storage/files-client"
import { MOCK_SEEDS, type MockSeed } from "@/lib/storage/mock-catalog"
import { MOCK_CLIPS_BASE64 } from "@/lib/storage/mock-clip"
import { mockPng } from "@/lib/storage/mock-png"

/**
 * Dev-only fake bucket. On when `STORAGE_MOCK=1` and Node is not in production,
 * so a production deploy cannot turn this on by accident and skip real credentials.
 */
export function isStorageMockEnabled(): boolean {
  return (
    process.env.STORAGE_MOCK === "1" && process.env.NODE_ENV !== "production"
  )
}

const textEncoder = new TextEncoder()
const clipCache = new Map<string, Uint8Array>()
const pngCache = new Map<string, Uint8Array>()

function clipFor(key: string): Uint8Array {
  const cached = clipCache.get(key)
  if (cached) return cached
  const name = key.slice(key.lastIndexOf("/") + 1).replace(/\.mp4$/, "")
  const encoded = MOCK_CLIPS_BASE64[name] ?? Object.values(MOCK_CLIPS_BASE64)[0]
  if (!encoded) return new Uint8Array()
  const bytes = Uint8Array.from(Buffer.from(encoded, "base64"))
  clipCache.set(key, bytes)
  return bytes
}

function etagFor(key: string): string {
  let hash = 2166136261
  for (const char of key) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return `"mock-${(hash >>> 0).toString(16)}"`
}

function bodyFor(seed: MockSeed): Uint8Array {
  if (seed.contentType.startsWith("image/")) {
    const cached = pngCache.get(seed.key)
    if (cached) return cached
    const png = mockPng(seed.key)
    pngCache.set(seed.key, png)
    return png
  }
  if (seed.contentType.startsWith("video/")) return clipFor(seed.key)
  if (seed.key.endsWith(".txt")) {
    return textEncoder.encode("Mock captions for the media library.\n")
  }
  if (seed.key.endsWith(".pdf")) {
    return textEncoder.encode(
      "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
    )
  }
  if (seed.key.endsWith(".mp3")) return textEncoder.encode("ID3mock-audio")
  if (seed.key.endsWith(".zip")) {
    return Uint8Array.from([
      0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0,
    ])
  }
  return textEncoder.encode("mock")
}

function arrayBufferOf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer
}

function notFound(key: string): Error {
  const error = new Error(`Object not found: ${key}`) as Error & {
    code?: string
  }
  error.name = "FilesError"
  error.code = "NotFound"
  return error
}

function findSeed(key: string): MockSeed | undefined {
  return MOCK_SEEDS.find((seed) => seed.key === key)
}

/** Listing metadata uses catalog sizes. Bodies stay small. */
function listed(seed: MockSeed): StoredFile {
  const name = seed.key.slice(seed.key.lastIndexOf("/") + 1)
  const bytes = () => bodyFor(seed)
  return {
    name,
    size: seed.size,
    type: seed.contentType,
    lastModified: Date.parse(seed.updatedAt),
    key: seed.key,
    etag: etagFor(seed.key),
    metadata: seed.durationSeconds
      ? { duration: String(seed.durationSeconds) }
      : undefined,
    arrayBuffer: async () => arrayBufferOf(bytes()),
    text: async () => new TextDecoder().decode(bytes()),
    stream: () => new Blob([bytes().slice()]).stream(),
    blob: async () => new Blob([bytes().slice()], { type: seed.contentType }),
  }
}

function downloaded(seed: MockSeed, bytes: Uint8Array): StoredFile {
  const name = seed.key.slice(seed.key.lastIndexOf("/") + 1)
  const copy = () => bytes.slice()
  return {
    name,
    size: bytes.byteLength,
    type: seed.contentType,
    lastModified: Date.parse(seed.updatedAt),
    key: seed.key,
    etag: etagFor(seed.key),
    arrayBuffer: async () => arrayBufferOf(copy()),
    text: async () => new TextDecoder().decode(copy()),
    stream: () => new Blob([copy()]).stream(),
    blob: async () => new Blob([copy()], { type: seed.contentType }),
  }
}

function readOnly(): never {
  throw new Error("This bucket is read-only.")
}

/**
 * In-memory `files-sdk` stand-in. Folder listing is delimiter-aware so All Files
 * still works; `listAll` walks every seed (no WebDAV PROPFIND).
 */
export function createMockFiles(): FilesClient {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

  return {
    adapter: { name: "mock" },
    async list(opts?: {
      prefix?: string
      delimiter?: string
      limit?: number
      cursor?: string
    }) {
      const prefix = opts?.prefix ?? ""
      const limit = opts?.limit ?? 1000
      const offset = Number(opts?.cursor ?? "0")
      const start = Number.isSafeInteger(offset) && offset > 0 ? offset : 0
      const matches = MOCK_SEEDS.filter((seed) => seed.key.startsWith(prefix))

      if (!opts?.delimiter) {
        const page = matches.slice(start, start + limit)
        const next = start + page.length
        return {
          items: page.map(listed),
          cursor: next < matches.length ? String(next) : undefined,
        }
      }

      const folders = new Set<string>()
      const files: MockSeed[] = []
      for (const seed of matches) {
        const rest = seed.key.slice(prefix.length)
        const slash = rest.indexOf("/")
        if (slash === -1) files.push(seed)
        else folders.add(`${prefix}${rest.slice(0, slash + 1)}`)
      }
      const combined = [
        ...[...folders]
          .sort()
          .map((path) => ({ kind: "folder" as const, path })),
        ...files.map((seed) => ({ kind: "file" as const, seed })),
      ]
      const page = combined.slice(start, start + limit)
      const next = start + page.length
      return {
        items: page
          .filter((entry) => entry.kind === "file")
          .map((entry) => listed(entry.seed)),
        prefixes: page
          .filter((entry) => entry.kind === "folder")
          .map((entry) => entry.path),
        cursor: next < combined.length ? String(next) : undefined,
      }
    },
    async *listAll(opts?: { prefix?: string }) {
      const prefix = opts?.prefix ?? ""
      for (const seed of MOCK_SEEDS) {
        if (seed.key.startsWith(prefix)) yield listed(seed)
      }
    },
    async download(
      key: string,
      opts?: { range?: { start: number; end?: number } }
    ) {
      const seed = findSeed(key)
      if (!seed) throw notFound(key)
      let bytes: Uint8Array = bodyFor(seed)
      const range = opts?.range
      if (range) {
        const start = range.start
        const end = Math.min(range.end ?? bytes.length - 1, bytes.length - 1)
        bytes =
          start >= bytes.length
            ? new Uint8Array()
            : bytes.subarray(start, end + 1)
      }
      return downloaded(seed, bytes)
    },
    async head(key: string) {
      const seed = findSeed(key)
      if (!seed) throw notFound(key)
      return downloaded(seed, bodyFor(seed))
    },
    async exists(key: string) {
      return Boolean(findSeed(key))
    },
    async url(key: string) {
      const params = new URLSearchParams({ c: MOCK_CONNECTION_ID, key })
      return `${basePath}/api/file?${params.toString()}`
    },
    upload: async () => readOnly(),
    delete: async () => readOnly(),
    copy: async () => readOnly(),
    move: async () => readOnly(),
    signedUploadUrl: async () => readOnly(),
  } as unknown as FilesClient
}
