import { defaultSchema } from "rehype-sanitize"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"

const EXPLICIT_PROTOCOL = /^[a-z][a-z\d+.-]*:/i

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return code <= 31 || code === 127
  })
}

function normalizeCandidate(value: string): string | undefined {
  const normalized = value.trim()
  if (!normalized) return undefined
  if (containsControlCharacter(normalized) || normalized.includes("\\")) {
    return undefined
  }
  if (normalized.startsWith("//")) return undefined
  return normalized
}

export function sanitizeLinkUrl(value: string): string | undefined {
  const normalized = normalizeCandidate(value)
  if (!normalized) return undefined

  if (!EXPLICIT_PROTOCOL.test(normalized)) return normalized

  try {
    const protocol = new URL(normalized).protocol.toLowerCase()
    return ["http:", "https:", "mailto:"].includes(protocol)
      ? normalized
      : undefined
  } catch {
    return undefined
  }
}

export function sanitizeImageUrl(value: string): string | undefined {
  const normalized = normalizeCandidate(value)
  if (!normalized || !EXPLICIT_PROTOCOL.test(normalized)) return undefined

  try {
    const protocol = new URL(normalized).protocol.toLowerCase()
    return protocol === "http:" || protocol === "https:" ? normalized : undefined
  } catch {
    return undefined
  }
}

export function isInternalMarkdownLink(value: string): boolean {
  return !EXPLICIT_PROTOCOL.test(value)
}

export const markdownRemarkPlugins = [remarkGfm, remarkBreaks]

export const markdownSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-./],
    ],
    ul: [
      ...(defaultSchema.attributes?.ul ?? []),
      ["className", "contains-task-list"],
    ],
    li: [
      ...(defaultSchema.attributes?.li ?? []),
      ["className", "task-list-item"],
    ],
    input: [
      ...(defaultSchema.attributes?.input ?? []),
      ["type", "checkbox"],
      ["checked", true],
      ["disabled", true],
    ],
    th: [...(defaultSchema.attributes?.th ?? []), ["align", "left", "center", "right"]],
    td: [...(defaultSchema.attributes?.td ?? []), ["align", "left", "center", "right"]],
  },
}
