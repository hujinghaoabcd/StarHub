import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const typescriptModule = await import('typescript')
const ts = typescriptModule.default || typescriptModule
const serviceSource = await readFile(
  new URL('../src/services/repositoryHighlights.ts', import.meta.url),
  'utf8'
)
const transpiled = ts.transpileModule(serviceSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022
  }
}).outputText
const repositoryHighlights = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
)

test('normalizeRepositoryHighlights accepts ids and objects, removes duplicates, and rejects stale ids', () => {
  const validIds = new Set([1, 2, 3])
  const normalized = repositoryHighlights.normalizeRepositoryHighlights(
    [
      1,
      { repositoryId: 2, markedAt: 50 },
      { repoId: 2, markedAt: 80 },
      { repositoryId: 4, markedAt: 100 },
      'invalid'
    ],
    validIds,
    10
  )

  assert.deepEqual(normalized, [
    { repositoryId: 2, markedAt: 80 },
    { repositoryId: 1, markedAt: 10 }
  ])
})

test('pruneRepositoryHighlights preserves only records for the latest repository snapshot', () => {
  const highlights = [
    { repositoryId: 1, markedAt: 10 },
    { repositoryId: 2, markedAt: 20 },
    { repositoryId: 3, markedAt: 30 }
  ]

  assert.deepEqual(
    repositoryHighlights.pruneRepositoryHighlights(
      highlights,
      new Set([1, 3])
    ),
    [highlights[0], highlights[2]]
  )
})

test('highlight persistence is independent and included in backup, sync cleanup, and UI entry points', async () => {
  const [database, repoStore, settings, sideMenu, repoList, repoCard, detail] =
    await Promise.all(
      [
        '../src/db/index.ts',
        '../src/stores/repo.ts',
        '../src/pages/Settings/index.vue',
        '../src/pages/Home/components/SideMenu.vue',
        '../src/pages/Home/components/RepoList.vue',
        '../src/pages/Home/components/RepoCard.vue',
        '../src/pages/Home/components/RepositoryDetailView.vue'
      ].map(path => readFile(new URL(path, import.meta.url), 'utf8'))
    )

  assert.match(database, /repositoryHighlights: 'repositoryId, markedAt'/)
  assert.match(repoStore, /pruneRepositoryHighlights/)
  assert.match(settings, /version: '4\.0'/)
  assert.match(settings, /highlights,/)
  assert.match(sideMenu, /highlight\.title/)
  assert.match(repoList, /command="highlighted"/)
  assert.match(repoList, /handleHighlightCommand/)
  assert.match(repoCard, /toggle-highlight/)
  assert.match(detail, /handleToggleHighlight/)
})
