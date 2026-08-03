export const MAX_CLASSIFICATION_README_CHARS = 12_000

export interface ClassificationReadmeExcerpt {
  summary: string
  sourceLength: number
  truncated: boolean
}

/**
 * Builds a bounded, text-only excerpt for classification. Code blocks, HTML,
 * images and badges are removed because they are noisy and frequently contain
 * prompt-like text that is unrelated to the repository's purpose.
 */
export function buildClassificationReadmeExcerpt(
  source: string,
  limit = MAX_CLASSIFICATION_README_CHARS
): ClassificationReadmeExcerpt {
  const safeLimit = Math.max(1_000, Math.min(MAX_CLASSIFICATION_README_CHARS, limit))
  const normalized = source
    .split(String.fromCharCode(0)).join('')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*\[[^\]]+\]:\s*\S+\s*$/gm, ' ')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  const summary = normalized.slice(0, safeLimit)

  return {
    summary,
    sourceLength: source.length,
    truncated: normalized.length > summary.length
  }
}
