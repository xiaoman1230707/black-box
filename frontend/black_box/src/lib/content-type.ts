export type ContentTypeVariant =
  | "news"
  | "guide"
  | "help"
  | "review"
  | "event"

export type PillVariant =
  | "accent"
  | "warm"
  | "soft"
  | ContentTypeVariant

export type TagChipVariant = PillVariant

const CONTENT_TYPE_VARIANTS: Readonly<Record<string, ContentTypeVariant>> = {
  资讯: "news",
  攻略: "guide",
  求助: "help",
  评测: "review",
  活动: "event",
}

const CONTENT_TYPE_VALUES = new Set<ContentTypeVariant>([
  "news",
  "guide",
  "help",
  "review",
  "event",
])

export function getContentTypeVariant(
  contentType: string | null | undefined
): ContentTypeVariant | "soft" {
  if (!contentType) return "soft"

  const normalized = contentType.trim()
  const mapped = CONTENT_TYPE_VARIANTS[normalized]
  if (mapped) return mapped

  return CONTENT_TYPE_VALUES.has(normalized as ContentTypeVariant)
    ? (normalized as ContentTypeVariant)
    : "soft"
}

