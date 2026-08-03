import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const typescriptModule = await import('typescript')
const ts = typescriptModule.default || typescriptModule

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

async function importTypescriptSource(path, transform = value => value) {
  const input = transform(await source(path))
  const transpiled = ts.transpileModule(input, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText

  return import(
    `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
  )
}

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial))
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }

  removeItem(key) {
    this.values.delete(key)
  }
}

test('AI API keys are session-only while non-secret preferences persist', async () => {
  const configModule = await importTypescriptSource('src/config/ai.ts')
  const sessionStorage = new MemoryStorage()
  const persistentStorage = new MemoryStorage()
  const storage = configModule.createAIConfigStorage({
    sessionStorage,
    persistentStorage
  })

  storage.save({
    provider: 'deepseek',
    apiKey: 'secret-key',
    baseURL: '',
    model: 'deepseek-chat',
    batchSize: 20
  })

  assert.equal(sessionStorage.getItem('ai_api_key'), 'secret-key')
  assert.equal(
    JSON.parse(persistentStorage.getItem('ai_config')).apiKey,
    undefined
  )
  assert.equal(storage.get().apiKey, 'secret-key')

  storage.clearKey()
  assert.equal(storage.get().apiKey, '')
  assert.equal(sessionStorage.getItem('ai_api_key'), null)
})

test('legacy persistent AI keys migrate once and are scrubbed', async () => {
  const configModule = await importTypescriptSource('src/config/ai.ts')
  const sessionStorage = new MemoryStorage()
  const persistentStorage = new MemoryStorage({
    ai_config: JSON.stringify({
      provider: 'qwen',
      apiKey: 'legacy-secret',
      model: 'qwen-plus',
      batchSize: 50
    })
  })
  const storage = configModule.createAIConfigStorage({
    sessionStorage,
    persistentStorage
  })

  assert.equal(storage.get().apiKey, 'legacy-secret')
  assert.equal(sessionStorage.getItem('ai_api_key'), 'legacy-secret')
  assert.equal(
    Object.hasOwn(JSON.parse(persistentStorage.getItem('ai_config')), 'apiKey'),
    false
  )
})

test('AI endpoints require public HTTPS hosts without embedded credentials', async () => {
  const endpointModule = await importTypescriptSource(
    'src/utils/aiEndpoint.ts',
    input => input
      .replace(/import type[^\n]+\n/, '')
      .replace(
        /import \{ DEFAULT_BASE_URLS \}[^\n]+\n/,
        `const DEFAULT_BASE_URLS = ${JSON.stringify({
          openai: 'https://api.openai.com/v1',
          claude: 'https://api.anthropic.com/v1',
          qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          zhipu: 'https://open.bigmodel.cn/api/paas/v4',
          deepseek: 'https://api.deepseek.com/v1'
        })}\n`
      )
  )

  assert.deepEqual(
    endpointModule.resolveAIEndpoint({ provider: 'openai', baseURL: '' }),
    {
      baseURL: 'https://api.openai.com/v1',
      host: 'api.openai.com',
      isCustom: false
    }
  )
  assert.equal(
    endpointModule.resolveAIEndpoint({
      provider: 'openai',
      baseURL: 'https://trusted.example.com/v1/'
    }).baseURL,
    'https://trusted.example.com/v1'
  )

  for (const baseURL of [
    'http://api.example.com/v1',
    'https://localhost/v1',
    'https://127.0.0.1/v1',
    'https://192.168.1.10/v1',
    'https://user:password@example.com/v1',
    'https://example.com/v1?key=value'
  ]) {
    assert.throws(
      () => endpointModule.resolveAIEndpoint({ provider: 'openai', baseURL }),
      { name: 'AIEndpointValidationError' }
    )
  }
})

test('classification batches enforce repository and category registries', async () => {
  const validation = await importTypescriptSource(
    'src/services/classificationValidation.ts'
  )

  assert.deepEqual(
    validation.validateClassificationItems(
      [1, 2],
      ['tag_gis', 'tag_tools'],
      [
        {
          repository_id: 1,
          category_id: 'tag_gis',
          confidence: 0.9,
          reason: 'Spatial analysis repository'
        },
        {
          repository_id: 2,
          category_id: 'tag_tools',
          confidence: 0.8,
          reason: 'General developer utility'
        }
      ]
    ),
    [
      {
        repositoryId: 1,
        categoryId: 'tag_gis',
        confidence: 0.9,
        reason: 'Spatial analysis repository'
      },
      {
        repositoryId: 2,
        categoryId: 'tag_tools',
        confidence: 0.8,
        reason: 'General developer utility'
      }
    ]
  )
  assert.throws(
    () => validation.validateClassificationItems(
      [1, 2],
      ['tag_gis'],
      [{
        repository_id: 1,
        category_id: 'tag_gis',
        confidence: 0.9,
        reason: 'GIS'
      }]
    ),
    /缺少仓库 ID/
  )
  assert.throws(
    () => validation.validateClassificationItems(
      [1, 2],
      ['tag_gis'],
      [
        {
          repository_id: 1,
          category_id: 'tag_gis',
          confidence: 0.9,
          reason: 'GIS'
        },
        {
          repository_id: 1,
          category_id: 'tag_gis',
          confidence: 0.8,
          reason: 'GIS'
        }
      ]
    ),
    /重复返回仓库 ID/
  )
  assert.throws(
    () => validation.validateClassificationItems(
      [1],
      ['tag_gis'],
      [{
        repository_id: 999,
        category_id: 'tag_gis',
        confidence: 0.9,
        reason: 'GIS'
      }]
    ),
    /当前批次之外/
  )
  assert.throws(
    () => validation.validateClassificationItems(
      [1],
      ['tag_gis'],
      [{
        repository_id: 1,
        category_id: 'invented_category',
        confidence: 0.9,
        reason: 'Invented'
      }]
    ),
    /未知分类 ID/
  )
  assert.throws(
    () => validation.validateClassificationItems(
      [1],
      ['tag_gis'],
      [{
        repository_id: 1,
        category_id: 'tag_gis',
        confidence: 1.5,
        reason: 'Invalid confidence'
      }]
    ),
    /置信度/
  )

  assert.deepEqual(
    validation.parseClassificationResponse(
      '{"classifications":[]}'
    ),
    { classifications: [] }
  )
  assert.throws(
    () => validation.parseClassificationResponse(
      '```json\n{"classifications":[]}\n```'
    ),
    /拒绝自动修补/
  )
})

test('DeepSeek v4 disables thinking and rejects empty or truncated final output', async () => {
  const compatibility = await importTypescriptSource(
    'src/services/openAICompatible.ts'
  )
  const body = compatibility.buildOpenAICompatibleRequestBody({
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    messages: [{ role: 'user', content: 'Return JSON' }],
    schema: { type: 'object' },
    maxOutputTokens: 8000
  })

  assert.deepEqual(body.thinking, { type: 'disabled' })
  assert.deepEqual(body.response_format, { type: 'json_object' })
  assert.equal(body.max_tokens, 8000)
  assert.equal(Object.hasOwn(body, 'max_completion_tokens'), false)
  assert.equal(
    compatibility.extractOpenAICompatibleText({
      choices: [{
        finish_reason: 'stop',
        message: { content: '{"classifications":[]}' }
      }]
    }, 'deepseek'),
    '{"classifications":[]}'
  )
  assert.throws(
    () => compatibility.extractOpenAICompatibleText({
      choices: [{
        finish_reason: 'length',
        message: { content: '{"classifications":[' }
      }]
    }, 'deepseek'),
    error => error.code === 'truncated_output' && error.canSplit === true
  )
  assert.throws(
    () => compatibility.extractOpenAICompatibleText({
      choices: [{
        finish_reason: 'stop',
        message: { content: '', reasoning_content: 'long internal reasoning' }
      }]
    }, 'deepseek'),
    error => error.code === 'empty_output' && /思考内容/.test(error.message)
  )
})

test('classification registry uses existing tag IDs and never preset-only IDs', async () => {
  const registry = await importTypescriptSource(
    'src/services/classificationRegistry.ts'
  )
  const now = Date.now()
  const categories = registry.buildClassificationRegistry(
    [{
      id: 'tag_existing',
      name: 'GIS',
      color: '#123456',
      createdAt: now,
      updatedAt: now,
      repos: []
    }],
    [
      {
        name: 'GIS',
        nameEn: 'GIS',
        emoji: '🗺️',
        description: '地理信息系统',
        descriptionEn: 'Geographic information systems',
        color: '#123456',
        keywords: ['spatial', 'mapping']
      },
      {
        name: 'Preset Only',
        nameEn: 'Preset Only',
        emoji: '',
        description: '未同步分类',
        descriptionEn: 'Not synced',
        color: '#999999',
        keywords: []
      }
    ],
    'zh'
  )

  assert.deepEqual(categories, [{
    categoryId: 'tag_existing',
    name: 'GIS',
    description: '地理信息系统',
    examples: ['spatial', 'mapping'],
    exclusions: []
  }])

  const secondCategory = {
    ...categories[0],
    categoryId: 'tag_1785760255553_75_u9rduyux6',
    name: 'Long opaque tag ID'
  }
  const modelRegistry = registry.buildModelFacingClassificationRegistry([
    categories[0],
    secondCategory
  ])

  assert.deepEqual(
    modelRegistry.categories.map(category => category.categoryId),
    ['c001', 'c002']
  )
  assert.equal(
    modelRegistry.modelCategoryIdByCategoryId.get(secondCategory.categoryId),
    'c002'
  )
  assert.deepEqual(
    registry.restorePersistedClassificationAssignments(
      [{
        repositoryId: 28387406,
        categoryId: 'c002',
        confidence: 0.9,
        reason: 'Matched the second category'
      }],
      modelRegistry.categoryIdByModelCategoryId
    ),
    [{
      repositoryId: 28387406,
      categoryId: secondCategory.categoryId,
      confidence: 0.9,
      reason: 'Matched the second category'
    }]
  )
  assert.throws(
    () => registry.restorePersistedClassificationAssignments(
      [{
        repositoryId: 28387406,
        categoryId: 'invented',
        confidence: 0.9,
        reason: 'Invalid token'
      }],
      modelRegistry.categoryIdByModelCategoryId
    ),
    /Unknown model category ID/
  )
})

test('classification UI cannot clear existing relationships and uses real cancellation', async () => {
  const sideMenu = await source('src/pages/Home/components/SideMenu.vue')
  const aiService = await source('src/services/ai.ts')
  const tagStore = await source('src/stores/tag.ts')
  const reviewDialog = await source(
    'src/pages/Home/components/ClassificationReviewDialog.vue'
  )
  const aiConfig = await source('src/config/ai.ts')
  const login = await source('src/pages/Login.vue')
  const settings = await source('src/pages/Settings/index.vue')
  const classificationTasks = await source(
    'src/services/classificationTasks.ts'
  )
  const openAICompatible = await source(
    'src/services/openAICompatible.ts'
  )

  assert.equal(sideMenu.includes('command="reclassify"'), false)
  assert.equal(sideMenu.includes('db.repoTags.clear()'), false)
  assert.equal(sideMenu.includes('正在强力清空所有分类关联'), false)
  assert.match(classificationTasks, /new AbortController|signal: AbortSignal/)
  assert.match(sideMenu, /classificationTaskStore\.pause\(\)/)
  assert.equal(sideMenu.includes('getReadme('), false)
  assert.match(classificationTasks, /signal,/)
  assert.match(classificationTasks, /任务已自动暂停：本批次没有任何有效结果/)
  assert.match(sideMenu, /onUnmounted\([\s\S]*classificationTaskStore\.pause/)

  assert.match(aiService, /fetchWithTimeout/)
  assert.match(aiService, /buildModelFacingClassificationRegistry/)
  assert.match(aiService, /restorePersistedClassificationAssignments/)
  assert.match(
    aiService,
    /ClassificationRunStatus[\s\S]*'success'[\s\S]*'partial'[\s\S]*'failed'[\s\S]*'cancelled'/
  )
  assert.match(openAICompatible, /type: 'json_schema'/)
  assert.match(openAICompatible, /strict: true/)
  assert.match(openAICompatible, /type: 'json_object'/)
  assert.match(aiService, /output_config/)
  assert.match(openAICompatible, /max_completion_tokens/)
  assert.match(openAICompatible, /thinking: \{ type: 'disabled' \}/)
  assert.match(aiService, /classifyBatchWithAdaptiveSplit/)
  assert.match(aiService, /error\.status === 500 \|\| error\.status === 503/)
  assert.equal(aiService.includes('lastCompleteObject'), false)
  assert.equal(aiService.includes('jsonMatch'), false)

  assert.match(sideMenu, /ClassificationReviewDialog/)
  assert.match(sideMenu, /applyClassificationAssignments/)
  assert.match(sideMenu, /undoClassificationCommit/)
  assert.equal(sideMenu.includes('CATEGORY_COLORS'), false)
  const generationFlow = sideMenu.slice(
    sideMenu.indexOf('const handleAutoClassify'),
    sideMenu.indexOf('const handleClassificationReviewConfirm')
  )
  assert.equal(generationFlow.includes('tagStore.createTag'), false)
  assert.equal(generationFlow.includes('tagStore.updateTag'), false)
  assert.equal(generationFlow.includes('applyClassificationAssignments'), false)
  assert.match(reviewDialog, /CONFIDENCE_THRESHOLD/)
  assert.match(reviewDialog, /PAGE_SIZE = 50/)
  assert.match(reviewDialog, /reviewPage/)

  assert.match(tagStore, /applyClassificationAssignments/)
  assert.match(tagStore, /db\.transaction\('rw', db\.tags, db\.repoTags/)
  assert.match(tagStore, /addedRelations/)
  assert.match(tagStore, /undoClassificationCommit/)

  assert.match(aiConfig, /claude: 'claude-sonnet-4-6'/)
  assert.equal(login.includes('95%'), false)

  assert.match(settings, /clearAIAPIKey/)
  assert.match(settings, /requestTimeoutMs|20_000/)
})
