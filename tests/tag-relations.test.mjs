import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const typescriptModule = await import('typescript')
const ts = typescriptModule.default || typescriptModule
const source = await readFile(
  new URL('../src/services/tagRelations.ts', import.meta.url),
  'utf8'
)
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022
  }
}).outputText
const relations = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
)

function tag(id, repos = []) {
  return {
    id,
    name: id,
    color: '#409EFF',
    repos,
    createdAt: 1,
    updatedAt: 2
  }
}

test('toStoredTag removes the derived repos field', () => {
  assert.deepEqual(relations.toStoredTag(tag('tag-1', [1, 2])), {
    id: 'tag-1',
    name: 'tag-1',
    color: '#409EFF',
    emoji: undefined,
    createdAt: 1,
    updatedAt: 2
  })
})

test('migrateLegacyTagRelations unions legacy and existing memberships', () => {
  assert.deepEqual(
    relations.migrateLegacyTagRelations(
      [tag('tag-1', [1, 2, 2]), tag('tag-2', [])],
      [
        { repoId: 2, tagId: 'tag-1' },
        { repoId: 3, tagId: 'tag-2' }
      ]
    ),
    [
      { repoId: 2, tagId: 'tag-1' },
      { repoId: 3, tagId: 'tag-2' },
      { repoId: 1, tagId: 'tag-1' }
    ]
  )
})

test('buildRepoTagsFromTags deduplicates memberships', () => {
  assert.deepEqual(
    relations.buildRepoTagsFromTags([
      tag('tag-1', [1, 1, 2]),
      tag('tag-2', [2])
    ]),
    [
      { repoId: 1, tagId: 'tag-1' },
      { repoId: 2, tagId: 'tag-1' },
      { repoId: 2, tagId: 'tag-2' }
    ]
  )
})

test('hydrateTags derives memberships from repoTags only', () => {
  const hydrated = relations.hydrateTags(
    [relations.toStoredTag(tag('tag-1')), relations.toStoredTag(tag('tag-2'))],
    [
      { repoId: 1, tagId: 'tag-1' },
      { repoId: 1, tagId: 'tag-1' },
      { repoId: 2, tagId: 'tag-2' },
      { repoId: 9, tagId: 'missing-tag' }
    ]
  )

  assert.deepEqual(hydrated.map(item => item.repos), [[1], [2]])
})

test('replaceRepositoryRelations changes one repository without touching others', () => {
  const result = relations.replaceRepositoryRelations(
    [
      { repoId: 1, tagId: 'tag-1' },
      { repoId: 2, tagId: 'tag-2' }
    ],
    1,
    ['tag-2', 'tag-2']
  )

  assert.deepEqual(result, [
    { repoId: 2, tagId: 'tag-2' },
    { repoId: 1, tagId: 'tag-2' }
  ])
})

test('replaceTagRelations changes one tag without touching other tags', () => {
  const result = relations.replaceTagRelations(
    [
      { repoId: 1, tagId: 'tag-1' },
      { repoId: 2, tagId: 'tag-2' }
    ],
    'tag-1',
    [3, 3, 4]
  )

  assert.deepEqual(result, [
    { repoId: 2, tagId: 'tag-2' },
    { repoId: 3, tagId: 'tag-1' },
    { repoId: 4, tagId: 'tag-1' }
  ])
})
