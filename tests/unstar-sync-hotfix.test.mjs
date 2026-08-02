import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const overview = await readFile(
  new URL('../src/pages/Home/components/RepositoryOverview.vue', import.meta.url),
  'utf8'
)
const store = await readFile(
  new URL('../src/stores/repo.ts', import.meta.url),
  'utf8'
)

test('unstar button is not disabled by background synchronization', () => {
  assert.match(overview, /:disabled="repo\.private"/)
  assert.doesNotMatch(
    overview,
    /:disabled="repo\.private \|\| repoStore\.isSyncing"/
  )
})

test('unstar cancels the active repository sync instead of rejecting', () => {
  assert.match(store, /cancelRepositorySync\(/)
  assert.doesNotMatch(
    store,
    /throw new Error\('Repository synchronization is in progress\.'\)/
  )
})
