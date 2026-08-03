import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('repository links and unstar are composed into one summary card', async () => {
  const home = await source('src/pages/Home/index.vue')
  const detail = await source(
    'src/pages/Home/components/RepositoryDetailView.vue'
  )

  assert.equal(home.includes('<RepositoryOverview'), false)
  assert.match(home, /<RepositoryDetailView/)
  assert.match(detail, /<RepositoryOverview[\s\S]*@unstarred=/)
  assert.match(detail, /class="summary-card"/)
  assert.match(detail, /unstarred: \[repoId: number\]/)
})

test('category name import is exposed from the home category tools', async () => {
  const home = await source('src/pages/Home/index.vue')

  assert.match(home, /TagNameImportDialog/)
  assert.match(home, /showImportTagDialog/)
  assert.match(home, /导入分类/)
  assert.match(home, /只导入名称，不分配项目/)
})

test('category name persistence only writes tag metadata', async () => {
  const persistence = await source(
    'src/services/tagNameImportPersistence.ts'
  )

  assert.match(persistence, /db\.tags\.bulkAdd/)
  assert.equal(persistence.includes('db.repoTags'), false)
  assert.equal(persistence.includes('repoId'), false)
  assert.equal(persistence.includes('repos:'), false)
})
