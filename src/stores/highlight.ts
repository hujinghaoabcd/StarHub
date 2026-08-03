import { defineStore } from 'pinia'
import { db } from '@/db'
import type { RepositoryHighlight } from '@/types'
import {
  runDataMutation,
  waitForDataMutations
} from '@/services/dataMutationQueue'

export const useHighlightStore = defineStore('highlight', {
  state: () => ({
    highlights: [] as RepositoryHighlight[],
    loading: false,
    isMutating: false
  }),

  getters: {
    highlightedIdSet: state =>
      new Set(state.highlights.map(highlight => highlight.repositoryId)),
    highlightedAtMap: state =>
      new Map(
        state.highlights.map(highlight => [
          highlight.repositoryId,
          highlight.markedAt
        ])
      ),
    count: state => state.highlights.length
  },

  actions: {
    async loadHighlights() {
      this.loading = true
      try {
        await waitForDataMutations()
        this.highlights = await db.repositoryHighlights
          .orderBy('markedAt')
          .reverse()
          .toArray()
      } finally {
        this.loading = false
      }
    },

    async setHighlighted(
      repositoryIds: readonly number[],
      highlighted: boolean
    ): Promise<number> {
      const uniqueIds = [...new Set(repositoryIds)].filter(
        repositoryId => Number.isSafeInteger(repositoryId) && repositoryId > 0
      )
      if (uniqueIds.length === 0) return 0

      const existingIds = new Set(
        this.highlights.map(highlight => highlight.repositoryId)
      )
      const changedIds = uniqueIds.filter(repositoryId =>
        highlighted
          ? !existingIds.has(repositoryId)
          : existingIds.has(repositoryId)
      )
      if (changedIds.length === 0) return 0

      this.isMutating = true
      try {
        const now = Date.now()
        await runDataMutation(async () => {
          if (highlighted) {
            await db.repositoryHighlights.bulkPut(
              changedIds.map((repositoryId, index) => ({
                repositoryId,
                markedAt: now + index
              }))
            )
          } else {
            await db.repositoryHighlights.bulkDelete(changedIds)
          }
        })
        await this.loadHighlights()
        return changedIds.length
      } finally {
        this.isMutating = false
      }
    },

    async toggleHighlight(repositoryId: number): Promise<boolean> {
      const nextValue = !this.highlightedIdSet.has(repositoryId)
      await this.setHighlighted([repositoryId], nextValue)
      return nextValue
    }
  }
})
