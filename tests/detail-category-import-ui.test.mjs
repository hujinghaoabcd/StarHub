import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('repository links are embedded in the main detail card', async () => {
  const home = await source('src/pages/Home/index.vue')
  const detail = await source('src/pages/Home/components/DetailView.vue')

  assert.equal(home.includes('<RepositoryOverview'), false)
  assert.match(detail, /<RepositoryOverview[\s\S]*@unstarred=/)
  assert.match(detail, /unstarred: \[repoId: number\]/)
})

test('category name import is exposed from the category toolbar', async () => {
  const sideMenu = await source('src/pages/Home/components/SideMenu.vue')

  assert.match(sideMenu, /TagNameImportDialog/)
  assert.match(sideMenu, /showImportTagDialog/)
  assert.match(sideMenu, /导入分类名称/)
})

test('category name import only writes tag metadata', async () => {
  const tagStore = await source('src/stores/tag.ts')
  const methodStart = tagStore.indexOf('async importTagNames(')
  const nextMethod = tagStore.indexOf('async updateTag(', methodStart)

  assert.notEqual(methodStart, -1)
  assert.notEqual(nextMethod, -1)

  const methodSource = tagStore.slice(methodStart, nextMethod)
  assert.match(methodSource, /db\.tags\.bulkAdd/)
  assert.equal(methodSource.includes('db.repoTags'), false)
  assert.equal(methodSource.includes('repos:'), true)
})
