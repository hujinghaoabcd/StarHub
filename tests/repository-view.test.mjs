import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const typescriptModule = await import('typescript')
const ts = typescriptModule.default || typescriptModule
const source = await readFile(
  new URL('../src/services/repositoryView.ts', import.meta.url),
  'utf8'
)
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022
  }
}).outputText
const repositoryView = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
)

function repository(id, overrides = {}) {
  return {
    id,
    name: `repo-${id}`,
    full_name: `owner/repo-${id}`,
    html_url: `https://github.com/owner/repo-${id}`,
    stargazers_count: id,
    forks_count: 0,
    open_issues_count: 0,
    updated_at: `2026-08-${String(id).padStart(2, '0')}T00:00:00Z`,
    created_at: `2026-01-${String(id).padStart(2, '0')}T00:00:00Z`,
    pushed_at: '2026-08-03T00:00:00Z',
    owner: {
      login: 'owner',
      avatar_url: 'https://example.com/avatar.png',
      html_url: 'https://github.com/owner'
    },
    archived: false,
    disabled: false,
    private: false,
    ...overrides
  }
}

test('sortRepositories sorts the complete collection before pagination', () => {
  const repositories = [
    repository(1, { stargazers_count: 10 }),
    repository(2, { stargazers_count: 100 }),
    repository(3, { stargazers_count: 50 })
  ]

  const sorted = repositoryView.sortRepositories(repositories, 'stars', 'desc')

  assert.deepEqual(sorted.map(repo => repo.id), [2, 3, 1])
  assert.deepEqual(sorted.slice(0, 2).map(repo => repo.id), [2, 3])
})

test('sortRepositories supports ascending and descending dates', () => {
  const repositories = [repository(3), repository(1), repository(2)]

  assert.deepEqual(
    repositoryView
      .sortRepositories(repositories, 'updated', 'asc')
      .map(repo => repo.id),
    [1, 2, 3]
  )
  assert.deepEqual(
    repositoryView
      .sortRepositories(repositories, 'created', 'desc')
      .map(repo => repo.id),
    [3, 2, 1]
  )
})

test('sortRepositories supports case-insensitive repository name ordering', () => {
  const repositories = [
    repository(1, { full_name: 'owner/zeta' }),
    repository(2, { full_name: 'owner/Alpha' }),
    repository(3, { full_name: 'owner/beta' })
  ]

  assert.deepEqual(
    repositoryView
      .sortRepositories(repositories, 'name', 'asc')
      .map(repo => repo.id),
    [2, 3, 1]
  )
})

test('sortRepositories places highlighted repositories first and preserves a useful fallback order', () => {
  const repositories = [repository(1), repository(2), repository(3)]
  const highlightedAt = new Map([
    [1, 100],
    [3, 200]
  ])

  assert.deepEqual(
    repositoryView
      .sortRepositories(repositories, 'highlighted', 'desc', highlightedAt)
      .map(repo => repo.id),
    [3, 1, 2]
  )
})

test('normalizeRepositoryPageSize accepts 1000 and rejects unsupported values', () => {
  assert.equal(repositoryView.normalizeRepositoryPageSize(1000), 1000)
  assert.equal(repositoryView.normalizeRepositoryPageSize(500), 500)
  assert.equal(repositoryView.normalizeRepositoryPageSize(750), 50)
})
