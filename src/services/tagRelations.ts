import type { RepoTag, StoredTag, Tag } from '@/types'

export interface LegacyTagWithRelations extends StoredTag {
  repos?: number[]
}

function uniqueFiniteRepositoryIds(repositoryIds: readonly number[]): number[] {
  return Array.from(
    new Set(repositoryIds.filter(repositoryId => Number.isFinite(repositoryId)))
  )
}

export function toStoredTag(tag: StoredTag | Tag): StoredTag {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    emoji: tag.emoji,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt
  }
}

export function deduplicateRepoTags(
  relations: readonly RepoTag[]
): RepoTag[] {
  const uniqueRelations = new Map<string, RepoTag>()

  for (const relation of relations) {
    if (!Number.isFinite(relation.repoId) || !relation.tagId) {
      continue
    }

    uniqueRelations.set(`${relation.repoId}:${relation.tagId}`, {
      repoId: relation.repoId,
      tagId: relation.tagId
    })
  }

  return Array.from(uniqueRelations.values())
}

export function migrateLegacyTagRelations(
  legacyTags: readonly LegacyTagWithRelations[],
  existingRelations: readonly RepoTag[]
): RepoTag[] {
  const validTagIds = new Set(legacyTags.map(tag => tag.id))

  return deduplicateRepoTags([
    ...existingRelations.filter(relation => validTagIds.has(relation.tagId)),
    ...legacyTags.flatMap(tag =>
      uniqueFiniteRepositoryIds(tag.repos || []).map(repositoryId => ({
        repoId: repositoryId,
        tagId: tag.id
      }))
    )
  ])
}

export function buildRepoTagsFromTags(tags: readonly Tag[]): RepoTag[] {
  return deduplicateRepoTags(
    tags.flatMap(tag =>
      uniqueFiniteRepositoryIds(tag.repos || []).map(repositoryId => ({
        repoId: repositoryId,
        tagId: tag.id
      }))
    )
  )
}

export function hydrateTags(
  storedTags: readonly StoredTag[],
  relations: readonly RepoTag[]
): Tag[] {
  const repositoryIdsByTag = new Map<string, number[]>()
  const validTagIds = new Set(storedTags.map(tag => tag.id))

  for (const relation of deduplicateRepoTags(relations)) {
    if (!validTagIds.has(relation.tagId)) {
      continue
    }

    const repositoryIds = repositoryIdsByTag.get(relation.tagId) || []
    repositoryIds.push(relation.repoId)
    repositoryIdsByTag.set(relation.tagId, repositoryIds)
  }

  return storedTags.map(tag => ({
    ...tag,
    repos: uniqueFiniteRepositoryIds(repositoryIdsByTag.get(tag.id) || [])
  }))
}

export function replaceRepositoryRelations(
  relations: readonly RepoTag[],
  repositoryId: number,
  tagIds: readonly string[]
): RepoTag[] {
  const preservedRelations = relations.filter(
    relation => relation.repoId !== repositoryId
  )
  const replacementRelations = Array.from(new Set(tagIds.filter(Boolean))).map(
    tagId => ({ repoId: repositoryId, tagId })
  )

  return deduplicateRepoTags([
    ...preservedRelations,
    ...replacementRelations
  ])
}

export function replaceTagRelations(
  relations: readonly RepoTag[],
  tagId: string,
  repositoryIds: readonly number[]
): RepoTag[] {
  const preservedRelations = relations.filter(relation => relation.tagId !== tagId)
  const replacementRelations = uniqueFiniteRepositoryIds(repositoryIds).map(
    repositoryId => ({ repoId: repositoryId, tagId })
  )

  return deduplicateRepoTags([
    ...preservedRelations,
    ...replacementRelations
  ])
}
