import { type Metadata } from "next"

import {
  browseSectionFromSegment,
  type BrowseSection,
} from "@/lib/browse-section"
import { siteConfig } from "@/lib/config/site"
import { MOCK_CONNECTION_ID } from "@/lib/storage/connections"
import type { MediaBootstrap } from "@/lib/storage/media"
import { listMediaPage, mediaSummary } from "@/lib/storage/media-index"
import { isStorageMockEnabled } from "@/lib/storage/mock-files"
import { DeepLinkSync } from "@/components/storage/deep-link-sync"
import { FileBrowser } from "@/components/storage/file-browser"
import { SectionUrlSync } from "@/components/storage/section-url-sync"

// Only the title differs from the root layout; the description is inherited.
export const metadata: Metadata = {
  title: { absolute: siteConfig.name },
}

export default async function IndexPage({
  params,
}: {
  params: Promise<{ section?: string[] }>
}) {
  const { section: segments } = await params
  const initialSection: BrowseSection = browseSectionFromSegment(segments?.[0])
  let initialMedia: MediaBootstrap | null = null

  // Server-render the mock library so /media is usable before the client store
  // hydrates (and so a curl of the page can see the seeded files). Real buckets
  // are not scanned here — the browser loads those after a connection is picked.
  if (initialSection === "media" && isStorageMockEnabled()) {
    const ref = { source: "env" as const, id: MOCK_CONNECTION_ID }
    const [page, summary] = await Promise.all([
      listMediaPage(ref, null),
      mediaSummary(ref),
    ])
    initialMedia = {
      connectionId: MOCK_CONNECTION_ID,
      connectionName: "Mock library",
      page,
      summary,
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SectionUrlSync />
      <DeepLinkSync />
      <FileBrowser
        initialSection={initialSection}
        initialMedia={initialMedia}
      />
    </div>
  )
}
