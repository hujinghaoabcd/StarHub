import { defineStore } from 'pinia'
import type { Repository } from '@/types'
import { db } from '@/db'
import { githubApi } from '@/api/github'
import { getPageFromLinkStr } from '@/utils'
import { useTagStore } from './tag'
import { runDataMutation } from '@/services/dataMutationQueue'
import {
  buildRepositorySnapshot,
  calculateRepositoryChanges,
  pruneRepoTagsForRepositories,
  type RepoSyncResult,
  type RepoSyncStatus
} from '@/services/repoSync'

const EMPTY_PROGRESS = {
  current: 0,
  total: 0,
  count: 0
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.name === 'QuotaExceededError' ||
    (error.name === 'DatabaseClosedError' &&
      error.message.includes('QuotaExceededError'))
  )
}

function cancelledResult(
  localCount: number,
  fetchedPages: number,
  totalPages: number,
  remoteCount: number,
  message: string
): RepoSyncResult {
  return {
    status: 'cancelled',
    fetchedPages,
    totalPages,
    localCount,
    remoteCount,
    added: 0,
    updated: 0,
    removed: 0,
    failedPages: [],
    message
  }
}

export const useRepoStore = defineStore('repo', {
  state: () => ({
    repos: [] as Repository[],
    loading: false,
    isFetching: true,
    isSyncing: false,
    currentSyncId: 0,
    syncStatus: 'idle' as RepoSyncStatus,
    lastSyncResult: null as RepoSyncResult | null,
    syncProgress: { ...EMPTY_PROGRESS },
    filterType: 'all' as 'all' | 'untagged',
    searchQuery: '',
    selectedLanguage: null as string | null,
    selectedTag: null as string | null,
    currentPage: 1,
    pageSize: 50
  }),

  getters: {
    allFilteredRepos(): Repository[] {
      let result = this.repos

      if (this.filterType === 'untagged') {
        result = this.untaggedRepos
      }

      if (this.selectedTag) {
        const tagStore = useTagStore()
        const tag = tagStore.tags.find(tagItem => tagItem.id === this.selectedTag)
        if (tag) {
          const tagRepoIds = new Set(tag.repos)
          result = result.filter(repository => tagRepoIds.has(repository.id))
        }
      }

      if (this.selectedLanguage) {
        result = result.filter(
          repository => repository.language === this.selectedLanguage
        )
      }

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        result = result.filter(
          repository =>
            repository.name.toLowerCase().includes(query) ||
            repository.full_name.toLowerCase().includes(query) ||
            repository.description?.toLowerCase().includes(query) ||
            repository.owner.login.toLowerCase().includes(query)
        )
      }

      return result
    },

    filteredRepos(): Repository[] {
      const start = (this.currentPage - 1) * this.pageSize
      return this.allFilteredRepos.slice(start, start + this.pageSize)
    },

    totalFilteredCount(): number {
      return this.allFilteredRepos.length
    },

    totalPages(): number {
      return Math.ceil(this.totalFilteredCount / this.pageSize)
    },

    untaggedRepos(): Repository[] {
      const tagStore = useTagStore()
      const taggedIds = new Set<number>()

      tagStore.tags.forEach(tag => {
        tag.repos.forEach(repositoryId => taggedIds.add(repositoryId))
      })

      return this.repos.filter(repository => !taggedIds.has(repository.id))
    },

    languages(): string[] {
      const languages = new Set<string>()
      this.repos.forEach(repository => {
        if (repository.language) {
          languages.add(repository.language)
        }
      })
      return Array.from(languages).sort()
    }
  },

  actions: {
    async loadRepos(skipLocalLoad = false): Promise<RepoSyncResult> {
      if (this.$state.isSyncing) {
        return cancelledResult(
          this.$state.repos.length,
          this.$state.syncProgress.current,
          this.$state.syncProgress.total,
          this.$state.syncProgress.count,
          'A repository sync is already in progress.'
        )
      }

      const syncId = Date.now()
      let localRepositories: Repository[] = []
      let fetchedPages = 0
      let totalPages = 0
      const remotePages: unknown[][] = []

      this.$state.currentSyncId = syncId
      this.$state.isSyncing = true
      this.$state.isFetching = true
      this.$state.syncStatus = 'syncing'
      this.$state.lastSyncResult = null
      this.$state.syncProgress = { ...EMPTY_PROGRESS }

      const isCurrentSync = () => this.$state.currentSyncId === syncId
      const remoteCount = () => buildRepositorySnapshot(remotePages).length

      const appendPage = (response: { data?: unknown }) => {
        const data = Array.isArray(response.data) ? response.data : []
        remotePages.push(data)
        fetchedPages++
        this.$state.syncProgress.current = fetchedPages
        this.$state.syncProgress.count = remoteCount()
      }

      try {
        localRepositories = await db.repos.toArray()

        if (!skipLocalLoad) {
          this.$state.repos = localRepositories
          this.$state.isFetching = localRepositories.length === 0
        } else {
          this.$state.repos = []
        }

        const firstPageResponse = await githubApi.getLoginUserStarred(100, 1)
        if (!isCurrentSync()) {
          return cancelledResult(
            localRepositories.length,
            fetchedPages,
            totalPages,
            remoteCount(),
            'Repository sync was cancelled before the first page completed.'
          )
        }

        appendPage(firstPageResponse)
        this.$state.isFetching = false

        const linkHeader =
          firstPageResponse.headers?.link || firstPageResponse.headers?.['link']
        totalPages = linkHeader ? Math.max(1, getPageFromLinkStr(linkHeader)) : 1
        this.$state.syncProgress.total = totalPages

        const failedPages: number[] = []
        const batchSize = 2

        for (let firstPage = 2; firstPage <= totalPages; firstPage += batchSize) {
          if (!isCurrentSync()) {
            return cancelledResult(
              localRepositories.length,
              fetchedPages,
              totalPages,
              remoteCount(),
              'Repository sync was cancelled.'
            )
          }

          const pageNumbers = Array.from(
            { length: Math.min(batchSize, totalPages - firstPage + 1) },
            (_, index) => firstPage + index
          )
          const settledPages = await Promise.allSettled(
            pageNumbers.map(page => githubApi.getLoginUserStarred(100, page))
          )

          if (!isCurrentSync()) {
            return cancelledResult(
              localRepositories.length,
              fetchedPages,
              totalPages,
              remoteCount(),
              'Repository sync was cancelled.'
            )
          }

          settledPages.forEach((settledPage, index) => {
            if (settledPage.status === 'fulfilled') {
              appendPage(settledPage.value)
            } else {
              failedPages.push(pageNumbers[index])
            }
          })

          if (failedPages.length > 0) {
            const result: RepoSyncResult = {
              status: 'partial',
              fetchedPages,
              totalPages,
              localCount: localRepositories.length,
              remoteCount: remoteCount(),
              added: 0,
              updated: 0,
              removed: 0,
              failedPages,
              message:
                'Some GitHub pages failed to load. The previous complete local snapshot was preserved.'
            }
            this.$state.syncStatus = 'partial'
            this.$state.lastSyncResult = result
            return result
          }
        }

        if (!isCurrentSync()) {
          return cancelledResult(
            localRepositories.length,
            fetchedPages,
            totalPages,
            remoteCount(),
            'Repository sync was cancelled before committing the snapshot.'
          )
        }

        const remoteRepositories = buildRepositorySnapshot(remotePages)
        const changes = calculateRepositoryChanges(
          localRepositories,
          remoteRepositories
        )
        const validRepositoryIds = new Set(
          remoteRepositories.map(repository => repository.id)
        )

        await runDataMutation(() =>
          db.transaction('rw', db.repos, db.repoTags, async () => {
            const storedRelations = await db.repoTags.toArray()
            const prunedRelations = pruneRepoTagsForRepositories(
              storedRelations,
              validRepositoryIds
            )

            await db.repos.clear()
            if (remoteRepositories.length > 0) {
              await db.repos.bulkAdd(remoteRepositories)
            }

            await db.repoTags.clear()
            if (prunedRelations.repoTags.length > 0) {
              await db.repoTags.bulkAdd(prunedRelations.repoTags)
            }
          })
        )

        if (!isCurrentSync()) {
          return cancelledResult(
            localRepositories.length,
            fetchedPages,
            totalPages,
            remoteRepositories.length,
            'Repository sync was cancelled after the database transaction.'
          )
        }

        this.$state.repos = remoteRepositories
        this.$state.currentPage = Math.min(
          this.$state.currentPage,
          Math.max(1, Math.ceil(remoteRepositories.length / this.$state.pageSize))
        )

        const tagStore = useTagStore()
        await tagStore.loadTags()

        const result: RepoSyncResult = {
          status: 'success',
          fetchedPages,
          totalPages,
          localCount: localRepositories.length,
          remoteCount: remoteRepositories.length,
          ...changes,
          failedPages: []
        }
        this.$state.syncStatus = 'success'
        this.$state.lastSyncResult = result
        return result
      } catch (error) {
        const message = errorMessage(error)
        const result: RepoSyncResult = {
          status: 'error',
          fetchedPages,
          totalPages,
          localCount: localRepositories.length,
          remoteCount: remoteCount(),
          added: 0,
          updated: 0,
          removed: 0,
          failedPages: [],
          message
        }

        if (isCurrentSync()) {
          this.$state.syncStatus = 'error'
          this.$state.lastSyncResult = result
        }

        console.error('Failed to synchronize repositories:', error)

        if (isQuotaError(error)) {
          const { ElMessageBox } = await import('element-plus')
          void ElMessageBox.alert(
            '浏览器存储空间不足，新的完整快照没有写入。请释放浏览器存储空间后重试。',
            '存储空间不足',
            {
              confirmButtonText: '我知道了',
              type: 'error'
            }
          )
        }

        return result
      } finally {
        if (this.$state.currentSyncId === syncId) {
          this.$state.currentSyncId = 0
          this.$state.isSyncing = false
          this.$state.isFetching = false
        }
      }
    },

    setSearchQuery(query: string) {
      this.$state.searchQuery = query
      this.$state.currentPage = 1
    },

    setSelectedLanguage(language: string | null) {
      this.$state.selectedLanguage = language
      this.$state.currentPage = 1
    },

    setSelectedTag(tagId: string | null) {
      this.$state.selectedTag = tagId
      this.$state.currentPage = 1
    },

    setFilterType(type: 'all' | 'untagged') {
      this.$state.filterType = type
      this.$state.currentPage = 1
      this.$state.selectedTag = null
    },

    setCurrentPage(page: number) {
      this.$state.currentPage = page
    },

    setPageSize(size: number) {
      this.$state.pageSize = size
      this.$state.currentPage = 1
    },

    async clearAndReload() {
      this.$state.currentSyncId = 0
      this.$state.isSyncing = false
      this.$state.isFetching = false
      this.$state.repos = []
      this.$state.selectedTag = null
      this.$state.selectedLanguage = null
      this.$state.filterType = 'all'
      this.$state.searchQuery = ''
      this.$state.currentPage = 1
      this.$state.syncStatus = 'idle'
      this.$state.lastSyncResult = null
      this.$state.syncProgress = { ...EMPTY_PROGRESS }

      const tagStore = useTagStore()
      await runDataMutation(() =>
        db.transaction(
          'rw',
          db.repos,
          db.tags,
          db.repoTags,
          async () => {
            await db.repos.clear()
            await db.tags.clear()
            await db.repoTags.clear()
          }
        )
      )
      tagStore.$state.tags = []
      tagStore.$state.loading = false
      tagStore.$state.isMutating = false

      const result = await this.loadRepos(true)
      if (result.status !== 'success') {
        throw new Error(
          result.message || `Repository reload ended with ${result.status}.`
        )
      }
    }
  }
})
