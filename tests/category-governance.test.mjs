import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const typescriptModule = await import('typescript')
const ts = typescriptModule.default || typescriptModule

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

async function importTypescriptSource(path) {
  const transpiled = ts.transpileModule(await source(path), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText
  return import(
    `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
  )
}

async function importGovernancePlanning() {
  const registryImport = await source('src/services/categoryRegistryImport.ts')
  const tagRelations = await source('src/services/tagRelations.ts')
  const governance = (await source('src/services/categoryGovernance.ts'))
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\n/gm, '')
  const transpiled = ts.transpileModule(
    `${registryImport}\n${tagRelations}\n${governance}`,
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022
      }
    }
  ).outputText
  return import(
    `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
  )
}

test('formal registry import is generic, versioned, and stable', async () => {
  const registryImport = await importTypescriptSource(
    'src/services/categoryRegistryImport.ts'
  )
  const result = registryImport.parseCategoryRegistryImport(JSON.stringify({
    version: 'team-taxonomy-2026.1',
    tags: [
      {
        categoryId: 'web.frontend',
        nameZh: '前端开发',
        nameEn: 'Frontend Development',
        aliases: ['Web UI', '客户端界面'],
        descriptionZh: '浏览器端界面与交互开发。',
        descriptionEn: 'Browser-based interface development.',
        examples: ['Vue', 'React'],
        exclusions: ['后端 API'],
        level1: '软件开发',
        level2: '前端'
      },
      {
        categoryId: 'data.engineering',
        nameZh: '数据工程',
        nameEn: 'Data Engineering'
      }
    ]
  }))

  assert.equal(result.sourceVersion, 'team-taxonomy-2026.1')
  assert.equal(result.definitions.length, 2)
  assert.equal(result.definitions[0].registryKey, 'web.frontend')
  assert.deepEqual(result.definitions[0].aliases, ['Web UI', '客户端界面', '前端'])
  assert.equal(
    registryImport.createStableCategoryId('web.frontend'),
    'category_web.frontend'
  )
})

test('plain names remain a supported user-defined registry format', async () => {
  const registryImport = await importTypescriptSource(
    'src/services/categoryRegistryImport.ts'
  )
  const first = registryImport.parseCategoryRegistryImport('Frontend\nData Engineering')
  const second = registryImport.parseCategoryRegistryImport('Frontend\nData Engineering')

  assert.deepEqual(
    first.definitions.map(item => item.registryKey),
    second.definitions.map(item => item.registryKey)
  )
  assert.equal(first.definitions.length, 2)
})

test('merge migration preserves and deduplicates every repository relation', async () => {
  const governance = await importGovernancePlanning()
  const tags = [
    {
      id: 'legacy-frontend',
      name: 'Frontend',
      color: '#111111',
      createdAt: 1,
      updatedAt: 1,
      repos: [1]
    },
    {
      id: 'legacy-web-ui',
      name: 'Web UI',
      color: '#222222',
      createdAt: 1,
      updatedAt: 1,
      repos: [2, 3]
    }
  ]
  const definition = {
    registryKey: 'web.frontend',
    nameZh: '前端开发',
    nameEn: 'Frontend Development',
    aliases: ['Frontend', 'Web UI'],
    descriptionZh: '浏览器端界面开发。',
    descriptionEn: 'Browser interface development.',
    examples: ['Vue'],
    exclusions: ['Backend']
  }
  const preview = governance.buildCategoryMigrationPreview(
    tags,
    [definition],
    'team-v1'
  )

  assert.equal(preview.hasConflicts, false)
  assert.equal(preview.operations[0].status, 'merge')
  assert.equal(preview.operations[0].targetTagId, 'legacy-web-ui')

  const state = governance.buildMigratedCategoryState(
    tags,
    [
      { repoId: 1, tagId: 'legacy-frontend' },
      { repoId: 2, tagId: 'legacy-web-ui' },
      { repoId: 2, tagId: 'legacy-frontend' },
      { repoId: 3, tagId: 'legacy-web-ui' }
    ],
    preview,
    'team-v1'
  )

  assert.equal(state.tags.length, 1)
  assert.equal(state.tags[0].id, 'legacy-web-ui')
  assert.equal(state.tags[0].name, '前端开发')
  assert.equal(state.tags[0].registry.registryKey, 'web.frontend')
  assert.deepEqual(state.repoTags, [
    { repoId: 1, tagId: 'legacy-web-ui' },
    { repoId: 2, tagId: 'legacy-web-ui' },
    { repoId: 3, tagId: 'legacy-web-ui' }
  ])
})

test('governance migration snapshots category relations and supports rollback', async () => {
  const [database, governance, manager, importDialog, classificationRegistry] =
    await Promise.all([
      source('src/db/index.ts'),
      source('src/services/categoryGovernance.ts'),
      source('src/pages/Home/components/CategoryManagerDialog.vue'),
      source('src/pages/Home/components/TagNameImportDialog.vue'),
      source('src/services/classificationRegistry.ts')
    ])

  assert.match(database, /categoryMigrationSnapshots: 'id, createdAt'/)
  assert.match(governance, /db\.categoryMigrationSnapshots\.add/)
  assert.match(governance, /db\.tags\.clear\(\)/)
  assert.match(governance, /db\.repoTags\.clear\(\)/)
  assert.match(governance, /deduplicateRepoTags/)
  assert.match(governance, /undoLatestCategoryMigration/)
  assert.match(manager, /只看空分类/)
  assert.match(manager, /项目数从多到少/)
  assert.match(manager, /合并到…/)
  assert.match(importDialog, /新增.*重命名.*合并/s)
  assert.match(importDialog, /preview\.hasConflicts/)
  assert.match(classificationRegistry, /tags\.some\(tag => tag\.registry\?\.managed\)/)
  assert.match(classificationRegistry, /registry-v\$\{isFormalRegistry \? 2 : 1\}/)
})
