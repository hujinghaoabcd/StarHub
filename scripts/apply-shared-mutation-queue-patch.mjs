import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/stores/repo.ts'
let source = await readFile(path, 'utf8')

if (!source.includes("from '@/services/dataMutationQueue'")) {
  source = source.replace(
    "import { useTagStore } from './tag'\n",
    "import { useTagStore } from './tag'\nimport { runDataMutation } from '@/services/dataMutationQueue'\n"
  )
}

const oldSyncTransaction = `        await db.transaction('rw', db.repos, db.repoTags, async () => {
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
        })`

const newSyncTransaction = `        await runDataMutation(() =>
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
        )`

if (source.includes(oldSyncTransaction)) {
  source = source.replace(oldSyncTransaction, newSyncTransaction)
} else if (!source.includes('await runDataMutation(() =>\n          db.transaction')) {
  throw new Error('Could not locate repository sync transaction')
}

const oldClear = `      const tagStore = useTagStore()
      await tagStore.replaceAllTags([])
      await db.repos.clear()`

const newClear = `      const tagStore = useTagStore()
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
      tagStore.$state.isMutating = false`

if (source.includes(oldClear)) {
  source = source.replace(oldClear, newClear)
} else if (!source.includes("tagStore.$state.isMutating = false")) {
  throw new Error('Could not locate clear-and-reload mutation')
}

await writeFile(path, source)
console.log('Applied shared mutation queue patch to repository store.')
