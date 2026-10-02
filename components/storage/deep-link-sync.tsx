"use client"

import * as React from "react"

import { useConnections } from "@/lib/store/connection-store"
import { useNavStore } from "@/lib/store/nav-store"
import type { Connection } from "@/lib/storage/connections"

/** Folder part of a key: "a/b/" stays, "a/b/file.mp4" becomes "a/b/", "" is the root. */
export function folderOf(path: string): string {
  const clean = path.replace(/^\/+/, "")
  if (!clean || clean.endsWith("/")) return clean
  const cut = clean.lastIndexOf("/")
  return cut === -1 ? "" : clean.slice(0, cut + 1)
}

/** `?storage=<id or name>` wins; otherwise the first connection on `?bucket=<name>`. */
export function findConnection(
  connections: Connection[],
  params: URLSearchParams
): Connection | null {
  const storage = params.get("storage")?.trim()
  if (storage) {
    const hit = connections.find(
      (c) => c.id === storage || c.name.toLowerCase() === storage.toLowerCase()
    )
    if (hit) return hit
  }
  const bucket = params.get("bucket")?.trim()
  if (!bucket) return null
  return connections.find((c) => c.bucket === bucket) ?? null
}

/**
 * Opens the folder a link points at, e.g. from the platform admin:
 * `/?bucket=pf-stg-outputs-eu&path=outputs/job_01/`. Applied once, when the
 * connections are known, then the parameters are dropped from the address bar
 * so a reload or a back navigation does not jump there again.
 */
export function DeepLinkSync() {
  const { connections, setActiveConnection } = useConnections()
  const setDeepLink = useNavStore((state) => state.setDeepLink)
  const setSection = useNavStore((state) => state.setSection)
  const done = React.useRef(false)

  React.useEffect(() => {
    if (done.current) return
    const params = new URLSearchParams(window.location.search)
    if (!params.has("bucket") && !params.has("storage")) {
      done.current = true
      return
    }
    if (connections.length === 0) return // env connections still loading
    done.current = true
    const connection = findConnection(connections, params)
    if (connection) {
      setActiveConnection(connection.id)
      setSection("all")
      setDeepLink({
        connId: connection.id,
        path: folderOf(params.get("path") ?? ""),
        nonce: Date.now(),
      })
    }
    for (const key of ["bucket", "storage", "path"]) params.delete(key)
    const query = params.toString()
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
    )
  }, [connections, setActiveConnection, setDeepLink, setSection])

  return null
}
