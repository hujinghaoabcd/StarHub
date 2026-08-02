import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import * as ts from 'typescript'

const source = await readFile(
  new URL('../src/services/repoSync.ts', import.meta.url),
  'utf8'
)
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022
  }
}).outputText
const sync = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
)

function repository(id, overrides = {}) {
  return {
    id,
    name: `repo-${id}`,
    full_name: `owner/repo-${id}`,
    description: `repository ${id}`,
    html_url: `https://github.com/owner/repo-${id}`,
    language: 'TypeScript',
    stargazers_count: id,
    forks_count: 0,
    open_issues_count: 0,
    updated_at: '2026-08-03T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    pushed_at: '2026-08-03T00:00:00Z',
    default_branch: 'main',
    owner: {
      login: 'owner',
      avatar_url: 'https://example.com/avatar.png',
      html_url: 'https://github.com/owner'
    },
    topics: ['test'],
    archived: false,
    disabled: false,
    private: false,
    ...overrides
  }
}

test('buildRepositorySnapshot keeps only the remote snapshot and deduplicates IDs', () => {
  const snapshot = sync.buildRepositorySnapshot([
    [repository(1), repository(2)],
    [repository(2, { stargazers_count: 200 }), repository(3)]
  ])

  assert.deepEqual(snapshot.map(repo => repo.id), [1, 2, 3])
  assert.equal(snapshot.find(repo => repo.id === 2).stargazers_count, 200)
})

test('calculateRepositoryChanges identifies added, updated, and unstarred repositories', () => {
  const local = [repository(1), repository(2), repository(99)]
  const remote = [
    repository(1),
    repository(2, { description: 'updated' }),
    repository(3)
  ]

  assert.deepEqual(sync.calculateRepositoryChanges(local, remote), {
    added: 1,
    updated: 1,
    removed: 1
  })
})

test('pruneTagsForRepositories removes ghost repository assignments only', () => {
  const tags = [
    {
      id: 'tag-1',
      name: 'GIS',
      color: '#000000',
      repos: [1, 2, 99],
      createdAt: 1,
      updatedAt: 1
    }
  ]

  const result = sync.pruneTagsForRepositories(tags, new Set([1, 2]), 10)

  assert.deepEqual(result.tags[0].repos, [1, 2])
  assert.equal(result.tags[0].updatedAt, 10)
  assert.equal(result.removedAssignments, 1)
})

test('pruneRepoTagsForRepositories removes join-table rows for unstarred repos', () => {
  const result = sync.pruneRepoTagsForRepositories(
    [
      { repoId: 1, tagId: 'tag-1' },
      { repoId: 99, tagId: 'tag-1' }
    ],
    new Set([1])
  )

  assert.deepEqual(result.repoTags, [{ repoId: 1, tagId: 'tag-1' }])
  assert.equal(result.removedAssignments, 1)
})
