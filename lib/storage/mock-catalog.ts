/**
 * Dev mock bucket (`STORAGE_MOCK=1`).
 *
 * Sizes here are the catalog sizes the media chart reports. Download bodies are
 * tiny generated placeholders; they are not these byte counts.
 */

export type MockSeed = {
  key: string
  /** Catalog size in bytes (chart + listings). */
  size: number
  /** Noon UTC so the calendar day is stable across nearby time zones. */
  updatedAt: string
  contentType: string
}

const DAY = {
  oct3: "2026-10-03T12:00:00.000Z",
  oct2: "2026-10-02T12:00:00.000Z",
  oct1: "2026-10-01T12:00:00.000Z",
  sep28: "2026-09-28T12:00:00.000Z",
  sep20: "2026-09-20T12:00:00.000Z",
} as const

export const MOCK_SEEDS: readonly MockSeed[] = [
  // 2026-10-03 — 6 images, 2 videos
  {
    key: "photos/2026-10-03/harbor-dawn.png",
    size: 2_400_000,
    updatedAt: DAY.oct3,
    contentType: "image/png",
  },
  {
    key: "photos/2026-10-03/market-stall.png",
    size: 1_800_000,
    updatedAt: DAY.oct3,
    contentType: "image/png",
  },
  {
    key: "photos/2026-10-03/courtyard.png",
    size: 3_100_000,
    updatedAt: DAY.oct3,
    contentType: "image/png",
  },
  {
    key: "photos/2026-10-03/lanterns.png",
    size: 2_250_000,
    updatedAt: DAY.oct3,
    contentType: "image/png",
  },
  {
    key: "photos/2026-10-03/rooftop-dusk.png",
    size: 2_750_000,
    updatedAt: DAY.oct3,
    contentType: "image/png",
  },
  {
    key: "photos/2026-10-03/spice-jars.png",
    size: 1_640_000,
    updatedAt: DAY.oct3,
    contentType: "image/png",
  },
  {
    key: "videos/2026-10-03/harbor-walk.mp4",
    size: 18_400_000,
    updatedAt: DAY.oct3,
    contentType: "video/mp4",
  },
  {
    key: "videos/2026-10-03/market-crowd.mp4",
    size: 22_100_000,
    updatedAt: DAY.oct3,
    contentType: "video/mp4",
  },

  // 2026-10-02 — 5 images, 1 video, 1 other
  {
    key: "photos/2026-10-02/pier-morning.png",
    size: 2_100_000,
    updatedAt: DAY.oct2,
    contentType: "image/png",
  },
  {
    key: "photos/2026-10-02/fishing-boats.png",
    size: 2_900_000,
    updatedAt: DAY.oct2,
    contentType: "image/png",
  },
  {
    key: "photos/2026-10-02/cafe-window.png",
    size: 1_520_000,
    updatedAt: DAY.oct2,
    contentType: "image/png",
  },
  {
    key: "photos/2026-10-02/old-gate.png",
    size: 1_980_000,
    updatedAt: DAY.oct2,
    contentType: "image/png",
  },
  {
    key: "photos/2026-10-02/citrus-crate.png",
    size: 2_300_000,
    updatedAt: DAY.oct2,
    contentType: "image/png",
  },
  {
    key: "videos/2026-10-02/boat-launch.mp4",
    size: 15_600_000,
    updatedAt: DAY.oct2,
    contentType: "video/mp4",
  },
  {
    key: "docs/2026-10-02/shot-list.pdf",
    size: 860_000,
    updatedAt: DAY.oct2,
    contentType: "application/pdf",
  },

  // 2026-10-01 — 4 images, 2 videos
  {
    key: "photos/2026-10-01/cedar-trail.png",
    size: 3_400_000,
    updatedAt: DAY.oct1,
    contentType: "image/png",
  },
  {
    key: "photos/2026-10-01/river-stones.png",
    size: 2_050_000,
    updatedAt: DAY.oct1,
    contentType: "image/png",
  },
  {
    key: "photos/2026-10-01/wildflowers.png",
    size: 1_760_000,
    updatedAt: DAY.oct1,
    contentType: "image/png",
  },
  {
    key: "photos/2026-10-01/bridge-fog.png",
    size: 2_880_000,
    updatedAt: DAY.oct1,
    contentType: "image/png",
  },
  {
    key: "videos/2026-10-01/trail-cam.mp4",
    size: 19_800_000,
    updatedAt: DAY.oct1,
    contentType: "video/mp4",
  },
  {
    key: "videos/2026-10-01/river-pass.mp4",
    size: 12_400_000,
    updatedAt: DAY.oct1,
    contentType: "video/mp4",
  },

  // 2026-09-28 — 3 images, 2 other
  {
    key: "photos/2026-09-28/library-stacks.png",
    size: 2_120_000,
    updatedAt: DAY.sep28,
    contentType: "image/png",
  },
  {
    key: "photos/2026-09-28/reading-room.png",
    size: 1_670_000,
    updatedAt: DAY.sep28,
    contentType: "image/png",
  },
  {
    key: "photos/2026-09-28/courtyard-cats.png",
    size: 1_430_000,
    updatedAt: DAY.sep28,
    contentType: "image/png",
  },
  {
    key: "audio/2026-09-28/field-notes.mp3",
    size: 4_200_000,
    updatedAt: DAY.sep28,
    contentType: "audio/mpeg",
  },
  {
    key: "notes/2026-09-28/captions.txt",
    size: 4_096,
    updatedAt: DAY.sep28,
    contentType: "text/plain",
  },

  // 2026-09-20 — 2 images, 1 video, 1 other
  {
    key: "photos/2026-09-20/desert-road.png",
    size: 3_250_000,
    updatedAt: DAY.sep20,
    contentType: "image/png",
  },
  {
    key: "photos/2026-09-20/oasis.png",
    size: 2_640_000,
    updatedAt: DAY.sep20,
    contentType: "image/png",
  },
  {
    key: "videos/2026-09-20/road-timelapse.mp4",
    size: 27_500_000,
    updatedAt: DAY.sep20,
    contentType: "video/mp4",
  },
  {
    key: "archive/2026-09-20/selects.zip",
    size: 48_000_000,
    updatedAt: DAY.sep20,
    contentType: "application/zip",
  },
]
