/** Only the folder-link parameters survive sign-in; anything else is dropped (no open redirect). */
const LINK_PARAMS = ["storage", "bucket", "path"] as const

export function afterLoginPath(search: string): string {
  const incoming = new URLSearchParams(search)
  const kept = new URLSearchParams()
  for (const key of LINK_PARAMS) {
    const value = incoming.get(key)
    if (value) kept.set(key, value.slice(0, 1024))
  }
  const query = kept.toString()
  return query ? `/?${query}` : "/"
}
