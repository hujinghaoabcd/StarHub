import Dexie, { Table } from 'dexie'
import type {
  CategoryMigrationSnapshot,
  ClassificationTask,
  ClassificationTaskItem,
  ClassificationReadmeCache,
  RepoTag,
  Repository,
  RepositoryHighlight,
  StoredTag
} from '@/types'
import {
  migrateLegacyTagRelations,
  toStoredTag,
  type LegacyTagWithRelations
} from '@/services/tagRelations'

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
  classificationTasks!: Table<ClassificationTask, string>
  classificationTaskItems!: Table<
    ClassificationTaskItem,
    [string, number]
  >
  classificationReadmeCache!: Table<ClassificationReadmeCache, number>
  repositoryHighlights!: Table<RepositoryHighlight, number>
  categoryMigrationSnapshots!: Table<CategoryMigrationSnapshot, string>

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
        const legacyTags = (await tagsTable.toArray()) as LegacyTagWithRelations[]
        const existingRelations = (await relationsTable.toArray()) as RepoTag[]
        const migratedRelations = migrateLegacyTagRelations(
          legacyTags,
          existingRelations
        )
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

    this.version(4).stores({
      repos: 'id, full_name, language, updated_at',
      tags: 'id, name, createdAt',
      repoTags: '[repoId+tagId], repoId, tagId',
      classificationTasks: 'id, status, updatedAt',
      classificationTaskItems:
        '[taskId+repositoryId], taskId, [taskId+status], [taskId+accepted], status, updatedAt'
    })

    this.version(5).stores({
      repos: 'id, full_name, language, updated_at',
      tags: 'id, name, createdAt',
      repoTags: '[repoId+tagId], repoId, tagId',
      classificationTasks: 'id, status, updatedAt',
      classificationTaskItems:
        '[taskId+repositoryId], taskId, [taskId+status], [taskId+accepted], status, updatedAt',
      classificationReadmeCache: 'repositoryId, fullName, fetchedAt'
    })

    this.version(6).stores({
      repos: 'id, full_name, language, updated_at',
      tags: 'id, name, createdAt',
      repoTags: '[repoId+tagId], repoId, tagId',
      classificationTasks: 'id, status, updatedAt',
      classificationTaskItems:
        '[taskId+repositoryId], taskId, [taskId+status], [taskId+accepted], [taskId+segmentIndex+status], [taskId+segmentIndex+accepted], [taskId+segmentIndex+committed], status, updatedAt',
      classificationReadmeCache: 'repositoryId, fullName, fetchedAt'
    })

    this.version(7).stores({
      repos: 'id, full_name, language, updated_at',
      tags: 'id, name, createdAt',
      repoTags: '[repoId+tagId], repoId, tagId',
      classificationTasks: 'id, status, updatedAt',
      classificationTaskItems:
        '[taskId+repositoryId], taskId, [taskId+status], [taskId+accepted], [taskId+segmentIndex+status], [taskId+segmentIndex+accepted], [taskId+segmentIndex+committed], status, updatedAt',
      classificationReadmeCache: 'repositoryId, fullName, fetchedAt',
      repositoryHighlights: 'repositoryId, markedAt'
    })

    this.version(8).stores({
      repos: 'id, full_name, language, updated_at',
      tags: 'id, name, createdAt',
      repoTags: '[repoId+tagId], repoId, tagId',
      classificationTasks: 'id, status, updatedAt',
      classificationTaskItems:
        '[taskId+repositoryId], taskId, [taskId+status], [taskId+accepted], [taskId+segmentIndex+status], [taskId+segmentIndex+accepted], [taskId+segmentIndex+committed], status, updatedAt',
      classificationReadmeCache: 'repositoryId, fullName, fetchedAt',
      repositoryHighlights: 'repositoryId, markedAt',
      categoryMigrationSnapshots: 'id, createdAt'
    })
  }
}

export const db = new StarHubDatabase()
