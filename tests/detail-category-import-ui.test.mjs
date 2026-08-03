import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('github and unstar actions share the repository header', async () => {
  const home = await source('src/pages/Home/index.vue')
  const detail = await source(
    'src/pages/Home/components/RepositoryDetailView.vue'
  )
  const overview = await source(
    'src/pages/Home/components/RepositoryOverview.vue'
  )

  assert.equal(home.includes('<RepositoryOverview'), false)
  assert.match(home, /<RepositoryDetailView/)
  assert.match(
    detail,
    /class="summary-actions"[\s\S]*class="github-link"[\s\S]*<RepositoryOverview/
  )
  assert.match(detail, /unstarred: \[repoId: number\]/)
  assert.match(overview, /class="unstar-button"/)
  assert.equal(overview.includes('permission-note'), false)
})

test('repository action buttons remain compact and equally sized', async () => {
  const detail = await source(
    'src/pages/Home/components/RepositoryDetailView.vue'
  )
  const overview = await source(
    'src/pages/Home/components/RepositoryOverview.vue'
  )

  assert.match(detail, /\.github-link\s*\{[\s\S]*height:\s*32px/)
  assert.match(detail, /\.github-link\s*\{[\s\S]*padding:\s*0 11px/)
  assert.match(overview, /\.unstar-button\s*\{[\s\S]*height:\s*32px/)
  assert.match(overview, /\.unstar-button\s*\{[\s\S]*padding:\s*0 11px/)
  assert.equal(detail.includes('height: 44px'), false)
  assert.equal(overview.includes('height: 44px'), false)
})

test('about is shown below the description without a github pages section', async () => {
  const detail = await source(
    'src/pages/Home/components/RepositoryDetailView.vue'
  )
  const overview = await source(
    'src/pages/Home/components/RepositoryOverview.vue'
  )

  assert.match(
    detail,
    /class="repo-description"[\s\S]*class="repo-about"[\s\S]*class="summary-actions"/
  )
  assert.equal(detail.includes('GitHub Pages'), false)
  assert.equal(overview.includes('GitHub Pages'), false)
  assert.equal(overview.includes('link-list'), false)
})

test('category tools expose import and delete-all without the old note', async () => {
  const home = await source('src/pages/Home/index.vue')

  assert.match(home, /TagNameImportDialog/)
  assert.match(home, /showImportTagDialog/)
  assert.match(home, /导入分类/)
  assert.match(home, /删除全部/)
  assert.match(home, /handleDeleteAllTags/)
  assert.match(home, /replaceAllTags\(\[\]\)/)
  assert.match(home, /不会删除任何项目/)
  assert.equal(home.includes('只导入名称，不分配项目'), false)
})

test('category toolbar buttons remain compact in the sidebar', async () => {
  const home = await source('src/pages/Home/index.vue')

  assert.match(home, /class="category-tool-button"/)
  assert.match(home, /\.category-tool-button\s*\{[\s\S]*height:\s*28px/)
  assert.match(home, /\.category-tool-button\s*\{[\s\S]*padding:\s*0 8px/)
  assert.match(home, /\.category-import-bar\s*\{[\s\S]*padding:\s*7px 10px/)
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
