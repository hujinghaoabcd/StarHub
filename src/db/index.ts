import Dexie, { Table } from 'dexie'
import type { RepoTag, Repository, StoredTag } from '@/types'
import {
  deduplicateRepoTags,
  toStoredTag
} from '@/services/tagRelations'

interface LegacyStoredTag extends StoredTag {
  repos?: number[]
}

/**
 * Shared IndexedDB database.
 *
 * Tag metadata is stored in tags. Repository membership is stored only in
 * repoTags; the UI-facing Tag.repos array is derived when tags are loaded.
 */
class StarHubDatabase extends Dexie {
  repos!: Table<Repository, number>
  tags!: Table<StoredTag, string>
  repoTags!: Table<RepoTag, [number, string]>

  constructor() {
    super('StarHubDB')

    this.version(1).stores({
      repos: 'id, full_name, language, updated_at',
      tags: 'id, name, createdAt'
    })

    this.version(2).stores({
      repos: 'id, full_name, language, updated_at',
      tags: 'id, name, createdAt',
      repoTags: '[repoId+tagId], repoId, tagId'
    })

    this.version(3)
      .stores({
        repos: 'id, full_name, language, updated_at',
        tags: 'id, name, createdAt',
        repoTags: '[repoId+tagId], repoId, tagId'
      })
      .upgrade(async transaction => {
        const tagsTable = transaction.table('tags')
        const relationsTable = transaction.table('repoTags')
        const legacyTags = (await tagsTable.toArray()) as LegacyStoredTag[]
        const existingRelations = (await relationsTable.toArray()) as RepoTag[]

        const migratedRelations = deduplicateRepoTags([
          ...existingRelations,
          ...legacyTags.flatMap(tag =>
            (tag.repos || []).map(repositoryId => ({
              repoId: repositoryId,
              tagId: tag.id
            }))
          )
        ])
        const storedTags = legacyTags.map(tag => toStoredTag(tag))

        await tagsTable.clear()
        if (storedTags.length > 0) {
          await tagsTable.bulkAdd(storedTags)
        }

        await relationsTable.clear()
        if (migratedRelations.length > 0) {
          await relationsTable.bulkAdd(migratedRelations)
        }
      })
  }
}

export const db = new StarHubDatabase()
