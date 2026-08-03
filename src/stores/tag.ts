import { defineStore } from 'pinia'
import type {
  ClassificationAssignment,
  ClassificationCommitReceipt,
  RepoTag,
  StoredTag,
  Tag
} from '@/types'
import { db } from '@/db'
import {
  buildRepoTagsFromTags,
  hydrateTags,
  toStoredTag
} from '@/services/tagRelations'
import {
  runDataMutation,
  waitForDataMutations
} from '@/services/dataMutationQueue'

async function ensureDatabaseOpen() {
  if (!db.isOpen()) {
    await db.open()
  }
}

function replaceTagInState(tags: Tag[], updatedTag: Tag): Tag[] {
  const index = tags.findIndex(tag => tag.id === updatedTag.id)
  if (index === -1) {
    return [...tags, updatedTag]
  }

  return [
    ...tags.slice(0, index),
    updatedTag,
    ...tags.slice(index + 1)
  ]
}

function createTagId(): string {
  return `tag_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

async function persistRepositoryTagSelection(
  tags: readonly Tag[],
  repoId: number,
  requestedTagIds: readonly string[]
): Promise<Tag[]> {
  await ensureDatabaseOpen()

  const existingTagIds = new Set(tags.map(tag => tag.id))
  const selectedTagIds = new Set(
    requestedTagIds.filter(tagId => existingTagIds.has(tagId))
  )
  const now = Date.now()
  const changedTags = tags
    .filter(
      tag => tag.repos.includes(repoId) !== selectedTagIds.has(tag.id)
    )
    .map(tag => ({
      ...tag,
      repos: selectedTagIds.has(tag.id)
        ? Array.from(new Set([...tag.repos, repoId]))
        : tag.repos.filter(existingRepoId => existingRepoId !== repoId),
      updatedAt: now
    }))

  await db.transaction('rw', db.tags, db.repoTags, async () => {
    await db.repoTags.where('repoId').equals(repoId).delete()

    const relations: RepoTag[] = Array.from(selectedTagIds).map(tagId => ({
      repoId,
      tagId
    }))
    if (relations.length > 0) {
      await db.repoTags.bulkAdd(relations)
    }

    if (changedTags.length > 0) {
      await db.tags.bulkPut(changedTags.map(toStoredTag))
    }
  })

  const changedById = new Map(changedTags.map(tag => [tag.id, tag]))
  return tags.map(tag => changedById.get(tag.id) || tag)
}

export const useTagStore = defineStore('tag', {
  state: () => ({
    tags: [] as Tag[],
    loading: false,
    isMutating: false
  }),

  getters: {
    tagMap(state): Map<string, Tag> {
      return new Map(state.tags.map(tag => [tag.id, tag]))
    }
  },

  actions: {
    async loadTags() {
      this.$state.loading = true

      try {
        await waitForDataMutations()
        await ensureDatabaseOpen()

        const [storedTags, relations] = await Promise.all([
          db.tags.toArray(),
          db.repoTags.toArray()
        ])
        this.$state.tags = hydrateTags(storedTags, relations)
      } catch (error) {
        console.error('Failed to load tags:', error)
        this.$state.tags = []

        if (error instanceof Error && error.name === 'QuotaExceededError') {
          const { ElMessageBox } = await import('element-plus')
          void ElMessageBox.alert(
            '浏览器存储空间已满。请清理浏览器数据或在设置中重新抓取。',
            '存储空间不足',
            {
              confirmButtonText: '我知道了',
              type: 'error'
            }
          )
        }
      } finally {
        this.$state.loading = false
      }
    },

    async createTag(
      name: string,
      color: string = '#409EFF',
      emoji?: string
    ): Promise<Tag> {
      return runDataMutation(async () => {
        this.$state.isMutating = true

        try {
          await ensureDatabaseOpen()
          const now = Date.now()
          const storedTag: StoredTag = {
            id: createTagId(),
            name,
            color,
            emoji,
            createdAt: now,
            updatedAt: now
          }

          await db.tags.add(storedTag)

          const tag: Tag = { ...storedTag, repos: [] }
          this.$state.tags = [...this.$state.tags, tag]
          return tag
        } finally {
          this.$state.isMutating = false
        }
      })
    },

    async updateTag(tagId: string, updates: Partial<Tag>) {
      return runDataMutation(async () => {
        this.$state.isMutating = true

        try {
          await ensureDatabaseOpen()
          const currentTag = this.$state.tags.find(tag => tag.id === tagId)
          if (!currentTag) {
            throw new Error('Tag not found')
          }

          const updatedTag: Tag = {
            ...currentTag,
            ...updates,
            id: currentTag.id,
            createdAt: currentTag.createdAt,
            repos: Array.isArray(updates.repos)
              ? Array.from(new Set(updates.repos.filter(Number.isFinite)))
              : [...currentTag.repos],
            updatedAt: Date.now()
          }
          const relationsWereUpdated = Array.isArray(updates.repos)

          await db.transaction('rw', db.tags, db.repoTags, async () => {
            await db.tags.put(toStoredTag(updatedTag))

            if (relationsWereUpdated) {
              await db.repoTags.where('tagId').equals(tagId).delete()
              const relations = updatedTag.repos.map(repoId => ({ repoId, tagId }))
              if (relations.length > 0) {
                await db.repoTags.bulkAdd(relations)
              }
            }
          })

          this.$state.tags = replaceTagInState(this.$state.tags, updatedTag)
        } finally {
          this.$state.isMutating = false
        }
      })
    },

    async deleteTag(tagId: string) {
      return runDataMutation(async () => {
        this.$state.isMutating = true

        try {
          await ensureDatabaseOpen()
          await db.transaction('rw', db.tags, db.repoTags, async () => {
            await db.tags.delete(tagId)
            await db.repoTags.where('tagId').equals(tagId).delete()
          })
          this.$state.tags = this.$state.tags.filter(tag => tag.id !== tagId)
        } finally {
          this.$state.isMutating = false
        }
      })
    },

    async replaceAllTags(tags: Tag[]) {
      return runDataMutation(async () => {
        this.$state.isMutating = true

        try {
          await ensureDatabaseOpen()
          const tagMap = new Map<string, Tag>()
          const now = Date.now()

          for (const tag of tags) {
            if (!tag.id || !tag.name) continue

            tagMap.set(tag.id, {
              ...tag,
              repos: Array.from(
                new Set((tag.repos || []).filter(Number.isFinite))
              ),
              createdAt: tag.createdAt || now,
              updatedAt: now
            })
          }

          const cleanTags = Array.from(tagMap.values())
          const storedTags = cleanTags.map(toStoredTag)
          const relations = buildRepoTagsFromTags(cleanTags)

          await db.transaction('rw', db.tags, db.repoTags, async () => {
            await db.tags.clear()
            if (storedTags.length > 0) {
              await db.tags.bulkAdd(storedTags)
            }

            await db.repoTags.clear()
            if (relations.length > 0) {
              await db.repoTags.bulkAdd(relations)
            }
          })

          this.$state.tags = hydrateTags(storedTags, relations)
        } finally {
          this.$state.isMutating = false
        }
      })
    },

    async updateAndSaveTags(tags: Tag[]) {
      await this.replaceAllTags(tags)
    },

    async replaceTagsForRepo(repoId: number, tagIds: string[]) {
      return runDataMutation(async () => {
        this.$state.isMutating = true

        try {
          this.$state.tags = await persistRepositoryTagSelection(
            this.$state.tags,
            repoId,
            tagIds
          )
        } finally {
          this.$state.isMutating = false
        }
      })
    },

    async setTagForRepo(repoId: number, tagId: string, selected: boolean) {
      return runDataMutation(async () => {
        this.$state.isMutating = true

        try {
          const tag = this.$state.tags.find(candidate => candidate.id === tagId)
          if (!tag) {
            throw new Error(`Tag ${tagId} not found`)
          }

          const selectedTagIds = this.$state.tags
            .filter(candidate =>
              candidate.id === tagId
                ? selected
                : candidate.repos.includes(repoId)
            )
            .map(candidate => candidate.id)

          this.$state.tags = await persistRepositoryTagSelection(
            this.$state.tags,
            repoId,
            selectedTagIds
          )
        } finally {
          this.$state.isMutating = false
        }
      })
    },

    async toggleTagForRepo(repoId: number, tagId: string) {
      return runDataMutation(async () => {
        this.$state.isMutating = true

        try {
          const tag = this.$state.tags.find(candidate => candidate.id === tagId)
          if (!tag) return

          const selected = !tag.repos.includes(repoId)
          const selectedTagIds = this.$state.tags
            .filter(candidate =>
              candidate.id === tagId
                ? selected
                : candidate.repos.includes(repoId)
            )
            .map(candidate => candidate.id)

          this.$state.tags = await persistRepositoryTagSelection(
            this.$state.tags,
            repoId,
            selectedTagIds
          )
        } finally {
          this.$state.isMutating = false
        }
      })
    },

    async getRepoTags(repoId: number): Promise<Tag[]> {
      await waitForDataMutations()
      return this.$state.tags.filter(tag => tag.repos.includes(repoId))
    },

    async addTagToRepo(repoId: number, tagId: string) {
      await this.setTagForRepo(repoId, tagId, true)
    },

    async removeTagFromRepo(repoId: number, tagId: string) {
      await this.setTagForRepo(repoId, tagId, false)
    },

    async applyClassificationAssignments(
      assignments: readonly ClassificationAssignment[]
    ): Promise<ClassificationCommitReceipt> {
      return runDataMutation(async () => {
        this.$state.isMutating = true

        try {
          await ensureDatabaseOpen()
          const knownTagIds = new Set(this.$state.tags.map(tag => tag.id))
          const requestedByKey = new Map<string, RepoTag>()
          const seenRepoIds = new Set<number>()

          for (const assignment of assignments) {
            if (!Number.isSafeInteger(assignment.repositoryId)) {
              throw new Error('AI classification contains an invalid repository ID')
            }
            if (!knownTagIds.has(assignment.categoryId)) {
              throw new Error(
                `AI classification references unknown category ${assignment.categoryId}`
              )
            }
            if (seenRepoIds.has(assignment.repositoryId)) {
              throw new Error(
                `AI classification contains duplicate repository ${assignment.repositoryId}`
              )
            }

            seenRepoIds.add(assignment.repositoryId)
            const relation = {
              repoId: assignment.repositoryId,
              tagId: assignment.categoryId
            }
            requestedByKey.set(
              `${relation.repoId}\u0000${relation.tagId}`,
              relation
            )
          }

          const repositoryIds = [...seenRepoIds]
          const now = Date.now()
          let addedRelations: RepoTag[] = []

          if (repositoryIds.length > 0) {
            await db.transaction('rw', db.tags, db.repoTags, async () => {
              const existingRelations = await db.repoTags
                .where('repoId')
                .anyOf(repositoryIds)
                .toArray()
              const existingKeys = new Set(
                existingRelations.map(
                  relation => `${relation.repoId}\u0000${relation.tagId}`
                )
              )
              addedRelations = [...requestedByKey.entries()]
                .filter(([key]) => !existingKeys.has(key))
                .map(([, relation]) => relation)

              if (addedRelations.length > 0) {
                await db.repoTags.bulkAdd(addedRelations)
                const changedTagIds = new Set(
                  addedRelations.map(relation => relation.tagId)
                )
                const changedTags = this.$state.tags
                  .filter(tag => changedTagIds.has(tag.id))
                  .map(tag => ({ ...tag, updatedAt: now }))
                if (changedTags.length > 0) {
                  await db.tags.bulkPut(changedTags.map(toStoredTag))
                }
              }
            })
          }

          if (addedRelations.length > 0) {
            const repoIdsByTag = new Map<string, number[]>()
            for (const relation of addedRelations) {
              const ids = repoIdsByTag.get(relation.tagId) || []
              ids.push(relation.repoId)
              repoIdsByTag.set(relation.tagId, ids)
            }
            this.$state.tags = this.$state.tags.map(tag => {
              const addedRepoIds = repoIdsByTag.get(tag.id)
              return addedRepoIds
                ? {
                    ...tag,
                    repos: [...new Set([...tag.repos, ...addedRepoIds])],
                    updatedAt: now
                  }
                : tag
            })
          }

          return {
            id: `classification_${now}_${Math.random().toString(36).slice(2, 9)}`,
            createdAt: now,
            addedRelations
          }
        } finally {
          this.$state.isMutating = false
        }
      })
    },

    async undoClassificationCommit(receipt: ClassificationCommitReceipt) {
      return runDataMutation(async () => {
        this.$state.isMutating = true

        try {
          await ensureDatabaseOpen()
          if (receipt.addedRelations.length === 0) return

          const now = Date.now()
          const changedTagIds = new Set(
            receipt.addedRelations.map(relation => relation.tagId)
          )
          await db.transaction('rw', db.tags, db.repoTags, async () => {
            await db.repoTags.bulkDelete(
              receipt.addedRelations.map(
                relation => [relation.repoId, relation.tagId] as [number, string]
              )
            )
            const changedTags = this.$state.tags
              .filter(tag => changedTagIds.has(tag.id))
              .map(tag => ({ ...tag, updatedAt: now }))
            if (changedTags.length > 0) {
              await db.tags.bulkPut(changedTags.map(toStoredTag))
            }
          })

          const removedKeys = new Set(
            receipt.addedRelations.map(
              relation => `${relation.repoId}\u0000${relation.tagId}`
            )
          )
          this.$state.tags = this.$state.tags.map(tag => ({
            ...tag,
            repos: tag.repos.filter(
              repoId => !removedKeys.has(`${repoId}\u0000${tag.id}`)
            ),
            updatedAt: changedTagIds.has(tag.id) ? now : tag.updatedAt
          }))
        } finally {
          this.$state.isMutating = false
        }
      })
    },

    async washTags(allRepoIds: Set<number>) {
      return runDataMutation(async () => {
        this.$state.isMutating = true

        try {
          await ensureDatabaseOpen()
          await db.transaction('rw', db.repoTags, async () => {
            const relations = await db.repoTags.toArray()
            const validRelations = relations.filter(relation =>
              allRepoIds.has(relation.repoId)
            )

            if (validRelations.length !== relations.length) {
              await db.repoTags.clear()
              if (validRelations.length > 0) {
                await db.repoTags.bulkAdd(validRelations)
              }
            }
          })

          const [storedTags, relations] = await Promise.all([
            db.tags.toArray(),
            db.repoTags.toArray()
          ])
          this.$state.tags = hydrateTags(storedTags, relations)
        } finally {
          this.$state.isMutating = false
        }
      })
    }
  }
})
