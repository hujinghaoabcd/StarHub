import type { RepoTag, Repository } from '@/types'

export type RepoSyncStatus =
  | 'idle'
  | 'syncing'
  | 'success'
  | 'partial'
  | 'error'
  | 'cancelled'

export interface RepoSyncResult {
  status: Exclude<RepoSyncStatus, 'idle' | 'syncing'>
  fetchedPages: number
  totalPages: number
  localCount: number
  remoteCount: number
  added: number
  updated: number
  removed: number
  failedPages: number[]
  message?: string
}

export interface RepositoryChanges {
  added: number
  updated: number
  removed: number
}

export interface PrunedRepoTagsResult {
  repoTags: RepoTag[]
  removedAssignments: number
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Repository payload must be an object')
  }
  return value as Record<string, any>
}

export function sanitizeRepository(value: unknown): Repository {
  const repo = asRecord(value)
  const owner = asRecord(repo.owner)

  if (!Number.isFinite(repo.id) || !repo.name || !repo.full_name || !repo.html_url) {
    throw new TypeError('Repository payload is missing required fields')
  }

  return {
    id: Number(repo.id),
    name: String(repo.name),
    full_name: String(repo.full_name),
    description:
      repo.description === null || repo.description === undefined
        ? undefined
        : String(repo.description),
    html_url: String(repo.html_url),
    homepage:
      repo.homepage === null || repo.homepage === undefined || repo.homepage === ''
        ? undefined
        : String(repo.homepage),
    has_pages: Boolean(repo.has_pages),
    language:
      repo.language === null || repo.language === undefined
        ? undefined
        : String(repo.language),
    stargazers_count: Number(repo.stargazers_count || 0),
    forks_count: Number(repo.forks_count || 0),
    open_issues_count: Number(repo.open_issues_count || 0),
    updated_at: String(repo.updated_at || ''),
    created_at: String(repo.created_at || ''),
    pushed_at: String(repo.pushed_at || ''),
    default_branch:
      repo.default_branch === null || repo.default_branch === undefined
        ? undefined
        : String(repo.default_branch),
    owner: {
      login: String(owner.login || ''),
      avatar_url: String(owner.avatar_url || ''),
      html_url: String(owner.html_url || '')
    },
    topics: Array.isArray(repo.topics)
      ? repo.topics.map((topic: unknown) => String(topic))
      : [],
    license:
      repo.license && typeof repo.license === 'object'
        ? {
            name: String(repo.license.name || ''),
            spdx_id: String(repo.license.spdx_id || '')
          }
        : undefined,
    archived: Boolean(repo.archived),
    disabled: Boolean(repo.disabled),
    private: Boolean(repo.private)
  }
}

export function buildRepositorySnapshot(pages: readonly unknown[][]): Repository[] {
  const repositories = new Map<number, Repository>()

  for (const page of pages) {
    for (const rawRepository of page) {
      const repository = sanitizeRepository(rawRepository)
      repositories.set(repository.id, repository)
    }
  }

  return Array.from(repositories.values())
}

function comparableRepository(repository: Repository): string {
  return JSON.stringify(repository)
}

export function calculateRepositoryChanges(
  localRepositories: readonly Repository[],
  remoteRepositories: readonly Repository[]
): RepositoryChanges {
  const localById = new Map(localRepositories.map(repository => [repository.id, repository]))
  const remoteById = new Map(remoteRepositories.map(repository => [repository.id, repository]))

  let added = 0
  let updated = 0
  let removed = 0

  for (const [id, remoteRepository] of remoteById) {
    const localRepository = localById.get(id)
    if (!localRepository) {
      added++
    } else if (
      comparableRepository(localRepository) !== comparableRepository(remoteRepository)
    ) {
      updated++
    }
  }

  for (const id of localById.keys()) {
    if (!remoteById.has(id)) {
      removed++
    }
  }

  return { added, updated, removed }
}

export function pruneRepoTagsForRepositories(
  repoTags: readonly RepoTag[],
  validRepositoryIds: ReadonlySet<number>
): PrunedRepoTagsResult {
  const prunedRepoTags = repoTags.filter(repoTag =>
    validRepositoryIds.has(repoTag.repoId)
  )

  return {
    repoTags: prunedRepoTags,
    removedAssignments: repoTags.length - prunedRepoTags.length
  }
}
