import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/pages/Settings/index.vue'
let source = await readFile(path, 'utf8')

if (!source.includes("from '@/services/dataMutationQueue'")) {
  source = source.replace(
    "import Dexie from 'dexie'",
    "import { runDataMutation } from '@/services/dataMutationQueue'\nimport Dexie from 'dexie'"
  )
}

const importTransaction = `      await db.transaction(
        'rw',
        db.repos,
        db.tags,
        db.repoTags,
        async () => {
          await db.repos.clear()
          await db.tags.clear()
          await db.repoTags.clear()

          if (importedRepos.length > 0) {
            await db.repos.bulkAdd(importedRepos)
          }
          if (storedTags.length > 0) {
            await db.tags.bulkAdd(storedTags)
          }
          if (relations.length > 0) {
            await db.repoTags.bulkAdd(relations)
          }
        }
      )`

const queuedImportTransaction = `      await runDataMutation(() =>
        db.transaction(
          'rw',
          db.repos,
          db.tags,
          db.repoTags,
          async () => {
            await db.repos.clear()
            await db.tags.clear()
            await db.repoTags.clear()

            if (importedRepos.length > 0) {
              await db.repos.bulkAdd(importedRepos)
            }
            if (storedTags.length > 0) {
              await db.tags.bulkAdd(storedTags)
            }
            if (relations.length > 0) {
              await db.repoTags.bulkAdd(relations)
            }
          }
        )
      )`

if (source.includes(importTransaction)) {
  source = source.replace(importTransaction, queuedImportTransaction)
} else if (!source.includes('await runDataMutation(() =>\n        db.transaction(\n          \'rw\',')) {
  throw new Error('Could not locate backup import transaction')
}

const clearTransaction = `          await db.transaction(
            'rw',
            db.repos,
            db.tags,
            db.repoTags,
            async () => {
              await db.repos.clear()
              await db.tags.clear()
              await db.repoTags.clear()
            }
          )`

const queuedClearTransaction = `          await runDataMutation(() =>
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
          )`

if (source.includes(clearTransaction)) {
  source = source.replace(clearTransaction, queuedClearTransaction)
} else if (!source.includes('await runDataMutation(() =>\n            db.transaction(')) {
  throw new Error('Could not locate clear-all transaction')
}

await writeFile(path, source)
console.log('Applied shared mutation queue to Settings maintenance operations.')
