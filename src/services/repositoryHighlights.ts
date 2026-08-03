import type { RepositoryHighlight } from '@/types'

function positiveInteger(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function finiteTimestamp(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Accept both the current object format and a plain repository-id list so
 * backups remain easy to inspect and future migrations stay inexpensive.
 */
export function normalizeRepositoryHighlights(
  input: unknown,
  validRepositoryIds?: ReadonlySet<number>,
  fallbackMarkedAt = Date.now()
): RepositoryHighlight[] {
  if (!Array.isArray(input)) return []

  const byRepositoryId = new Map<number, RepositoryHighlight>()

  input.forEach((entry, index) => {
    const source =
      entry && typeof entry === 'object'
        ? (entry as Record<string, unknown>)
        : null
    const repositoryId = positiveInteger(
      source?.repositoryId ?? source?.repoId ?? entry
    )

    if (
      repositoryId === null ||
      (validRepositoryIds && !validRepositoryIds.has(repositoryId))
    ) {
      return
    }

    const markedAt = finiteTimestamp(
      source?.markedAt,
      fallbackMarkedAt + index
    )
    const existing = byRepositoryId.get(repositoryId)
    if (!existing || markedAt > existing.markedAt) {
      byRepositoryId.set(repositoryId, { repositoryId, markedAt })
    }
  })

  return [...byRepositoryId.values()].sort(
    (left, right) => right.markedAt - left.markedAt
  )
}

export function pruneRepositoryHighlights(
  highlights: readonly RepositoryHighlight[],
  validRepositoryIds: ReadonlySet<number>
): RepositoryHighlight[] {
  return highlights.filter(highlight =>
    validRepositoryIds.has(highlight.repositoryId)
  )
}
