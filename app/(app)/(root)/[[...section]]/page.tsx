import { type Metadata } from "next"

import { siteConfig } from "@/lib/config/site"
import { FileBrowser } from "@/components/storage/file-browser"
import { DeepLinkSync } from "@/components/storage/deep-link-sync"
import { SectionUrlSync } from "@/components/storage/section-url-sync"

// Only the title differs from the root layout; the description is inherited.
export const metadata: Metadata = {
  title: { absolute: siteConfig.name },
}

export default function IndexPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SectionUrlSync />
      <DeepLinkSync />
      <FileBrowser />
    </div>
  )
}
