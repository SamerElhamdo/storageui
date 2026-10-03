export type BrowseSection = "all" | "recents" | "starred" | "media"

export function browseSectionFromSegment(
  segment: string | undefined
): BrowseSection {
  const value = segment?.toLowerCase()
  if (value === "recents" || value === "starred" || value === "media") {
    return value
  }
  return "all"
}
