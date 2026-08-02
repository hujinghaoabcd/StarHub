import { readFile, writeFile } from 'node:fs/promises'

async function replaceExact(path, search, replacement, label) {
  const source = await readFile(path, 'utf8')
  const occurrences = source.split(search).length - 1

  if (occurrences !== 1) {
    throw new Error(`${label}: expected exactly one match in ${path}, found ${occurrences}`)
  }

  await writeFile(path, source.replace(search, replacement))
}

await replaceExact(
  'src/pages/Home/components/RepositoryOverview.vue',
  ':disabled="repo.private || repoStore.isSyncing"',
  ':disabled="repo.private"',
  'remove sync-based button disabling'
)

await replaceExact(
  'src/pages/Home/components/RepositoryOverview.vue',
  `async function handleUnstar() {\n  if (repoStore.isSyncing) {\n    ElMessage.warning('仓库正在同步，请等待同步完成后再取消 Star。')\n    return\n  }\n\n  try {`,
  `async function handleUnstar() {\n  try {`,
  'remove early sync rejection'
)

await replaceExact(
  'src/pages/Home/components/RepositoryOverview.vue',
  `  } catch {\n    return\n  }\n\n  unstarLoading.value = true`,
  `  } catch {\n    return\n  }\n\n  if (repoStore.isSyncing) {\n    repoStore.cancelRepositorySync(\n      'Repository sync was cancelled before removing a star.'\n    )\n    ElMessage.info('已暂停后台同步，正在取消 Star。')\n  }\n\n  unstarLoading.value = true`,
  'cancel sync after confirmation'
)

await replaceExact(
  'src/stores/repo.ts',
  `    setPageSize(size: number) {\n      this.$state.pageSize = normalizeRepositoryPageSize(size)\n      this.$state.currentPage = 1\n    },\n\n    async removeRepository(repoId: number) {`,
  `    setPageSize(size: number) {\n      this.$state.pageSize = normalizeRepositoryPageSize(size)\n      this.$state.currentPage = 1\n    },\n\n    cancelRepositorySync(\n      message = 'Repository sync was cancelled for a user action.'\n    ): boolean {\n      if (!this.$state.isSyncing) return false\n\n      const result = cancelledResult(\n        this.$state.repos.length,\n        this.$state.syncProgress.current,\n        this.$state.syncProgress.total,\n        this.$state.syncProgress.count,\n        message\n      )\n\n      this.$state.currentSyncId = 0\n      this.$state.isSyncing = false\n      this.$state.isFetching = false\n      this.$state.syncStatus = 'cancelled'\n      this.$state.lastSyncResult = result\n      return true\n    },\n\n    async removeRepository(repoId: number) {`,
  'add controlled sync cancellation'
)

await replaceExact(
  'src/stores/repo.ts',
  `    async unstarRepository(repository: Repository) {\n      if (this.$state.isSyncing) {\n        throw new Error('Repository synchronization is in progress.')\n      }\n\n      const [owner, name] = repository.full_name.split('/')`,
  `    async unstarRepository(repository: Repository) {\n      this.cancelRepositorySync(\n        'Repository sync was cancelled before removing a star.'\n      )\n\n      const [owner, name] = repository.full_name.split('/')`,
  'make unstar cancel sync defensively'
)
