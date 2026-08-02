import type { Repository } from '@/types'

export type RepositorySortField = 'updated' | 'stars' | 'created' | 'name'
export type RepositorySortOrder = 'asc' | 'desc'

export const REPOSITORY_PAGE_SIZES = [50, 100, 200, 500, 1000] as const

export function normalizeRepositoryPageSize(value: number): number {
  return REPOSITORY_PAGE_SIZES.includes(
    value as (typeof REPOSITORY_PAGE_SIZES)[number]
  )
    ? value
    : 50
}

function timestamp(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function compareRepositories(
  left: Repository,
  right: Repository,
  field: RepositorySortField
): number {
  switch (field) {
    case 'stars':
      return left.stargazers_count - right.stargazers_count
    case 'created':
      return timestamp(left.created_at) - timestamp(right.created_at)
    case 'name':
      return left.full_name.localeCompare(right.full_name, undefined, {
        sensitivity: 'base',
        numeric: true
      })
    case 'updated':
    default:
      return timestamp(left.updated_at) - timestamp(right.updated_at)
  }
}

export function sortRepositories(
  repositories: readonly Repository[],
  field: RepositorySortField,
  order: RepositorySortOrder
): Repository[] {
  const direction = order === 'asc' ? 1 : -1

  return repositories
    .map((repository, index) => ({ repository, index }))
    .sort((left, right) => {
      const comparison = compareRepositories(
        left.repository,
        right.repository,
        field
      )

      if (comparison !== 0) {
        return comparison * direction
      }

      return left.index - right.index
    })
    .map(item => item.repository)
}
