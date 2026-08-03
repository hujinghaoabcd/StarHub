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

function repository(id) {
  return {
    id,
    name: `repo-${id}`,
    full_name: `owner/repo-${id}`,
    description: `Repository ${id}`,
    html_url: `https://github.com/owner/repo-${id}`,
    language: id % 2 ? 'TypeScript' : 'Python',
    topics: ['tooling', `topic-${id % 10}`],
    stargazers_count: 0,
    forks_count: 0,
    open_issues_count: 0,
    updated_at: '2026-08-03T00:00:00Z',
    created_at: '2026-08-03T00:00:00Z',
    pushed_at: '2026-08-03T00:00:00Z',
    owner: {
      login: 'owner',
      avatar_url: '',
      html_url: 'https://github.com/owner'
    },
    archived: false,
    disabled: false,
    private: false,
    readme: 'This field must never enter the C1 model payload.'
  }
}

const categories = [{
  categoryId: 'tag_tools',
  name: 'Tools',
  description: 'Developer tools',
  examples: ['CLI'],
  exclusions: []
}]

test('C1 metadata payload never includes README content', async () => {
  const protocol = await importTypescriptSource(
    'src/services/classificationProtocol.ts'
  )
  const metadata = protocol.buildRepositoryClassificationMetadata(repository(1))

  assert.deepEqual(Object.keys(metadata), [
    'repository_id',
    'name',
    'full_name',
    'description',
    'language',
    'topics'
  ])
  assert.equal(JSON.stringify(metadata).includes('readme'), false)

  const ai = await source('src/services/ai.ts')
  assert.equal(ai.includes('readme_preview'), false)
  assert.match(ai, /repos\.map\(buildRepositoryClassificationMetadata\)/)
})

test('usage planning handles 17,000 repositories without materializing README data', async () => {
  const protocol = await importTypescriptSource(
    'src/services/classificationProtocol.ts'
  )
  const repositories = Array.from({ length: 17_000 }, (_, index) =>
    repository(index + 1)
  )
  const estimate = protocol.estimateClassificationUsage(
    repositories,
    categories,
    50
  )

  assert.equal(estimate.repositoryCount, 17_000)
  assert.equal(estimate.batchCount, 340)
  assert.ok(estimate.estimatedInputTokens > 0)
  assert.equal(estimate.estimatedOutputTokens, 340 * 8_000)
})

test('registry versions are deterministic and protect changed category contracts', async () => {
  const registry = await importTypescriptSource(
    'src/services/classificationRegistry.ts'
  )
  const second = {
    categoryId: 'tag_data',
    name: 'Data',
    description: 'Data systems',
    examples: [],
    exclusions: []
  }
  const version = registry.buildClassificationRegistryVersion([
    categories[0],
    second
  ])

  assert.equal(
    version,
    registry.buildClassificationRegistryVersion([second, categories[0]])
  )
  assert.notEqual(
    version,
    registry.buildClassificationRegistryVersion([
      { ...categories[0], description: 'Changed contract' },
      second
    ])
  )
})

test('classification tasks persist per-repository drafts and page review results', async () => {
  const database = await source('src/db/index.ts')
  const tasks = await source('src/services/classificationTasks.ts')
  const sideMenu = await source('src/pages/Home/components/SideMenu.vue')
  const dialog = await source(
    'src/pages/Home/components/ClassificationReviewDialog.vue'
  )

  assert.match(database, /version\(4\)/)
  assert.match(database, /classificationTasks: 'id, status, updatedAt'/)
  assert.match(database, /\[taskId\+repositoryId\]/)
  assert.match(database, /\[taskId\+status\]/)
  assert.match(database, /\[taskId\+accepted\]/)

  assert.match(tasks, /recoverInterruptedClassificationTask/)
  assert.match(tasks, /getPendingClassificationTaskItems/)
  assert.match(tasks, /saveClassificationBatchResult/)
  assert.match(tasks, /retryFailedClassificationItems/)
  assert.match(tasks, /getClassificationReviewPage/)
  assert.match(tasks, /markClassificationTaskCommitted/)
  assert.match(tasks, /status: 'committed'/)
  assert.match(tasks, /assertClassificationTaskCompatible/)

  const generation = tasks.slice(
    tasks.indexOf('export async function executeClassificationTask'),
    tasks.indexOf('export { errorMessage')
  )
  assert.equal(generation.includes('repoTags'), false)
  assert.equal(generation.includes('getReadme'), false)
  assert.equal(generation.includes('applyClassificationAssignments'), false)

  assert.equal(sideMenu.includes('includeReadme'), false)
  assert.match(sideMenu, /estimatedInputTokens/)
  assert.match(sideMenu, /classificationTaskStore\.retryFailures/)
  assert.match(sideMenu, /existingTask && !existingTask\.committedAt/)
  assert.match(dialog, /PAGE_SIZE = 50/)
  assert.match(dialog, /reviewCommitPaused/)
  assert.match(dialog, /commitPausedMessage/)
  assert.match(
    dialog,
    /:disabled="task\.acceptedCount === 0 \|\| task\.status === 'running'"/
  )
  assert.doesNotMatch(dialog, /:disabled="[^"]*task\.status === 'paused'/)
  assert.equal(dialog.includes(':data="items"'), false)
})
