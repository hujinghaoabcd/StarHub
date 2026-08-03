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

test('classification batches reject missing, duplicate, and unknown repository IDs', async () => {
  const validation = await importTypescriptSource(
    'src/services/classificationValidation.ts'
  )

  assert.deepEqual(
    Object.fromEntries(validation.validateClassificationItems(
      [1, 2],
      [
        { id: 1, category: 'GIS' },
        { id: '2', category: 'Tools' }
      ]
    )),
    { GIS: [1], Tools: [2] }
  )
  assert.throws(
    () => validation.validateClassificationItems(
      [1, 2],
      [{ id: 1, category: 'GIS' }]
    ),
    /缺少仓库 ID/
  )
  assert.throws(
    () => validation.validateClassificationItems(
      [1, 2],
      [
        { id: 1, category: 'GIS' },
        { id: 1, category: 'GIS' }
      ]
    ),
    /重复返回仓库 ID/
  )
  assert.throws(
    () => validation.validateClassificationItems(
      [1],
      [{ id: 999, category: 'GIS' }]
    ),
    /当前批次之外/
  )
})

test('classification UI cannot clear existing relationships and uses real cancellation', async () => {
  const sideMenu = await source('src/pages/Home/components/SideMenu.vue')
  const aiService = await source('src/services/ai.ts')
  const settings = await source('src/pages/Settings/index.vue')

  assert.equal(sideMenu.includes('command="reclassify"'), false)
  assert.equal(sideMenu.includes('db.repoTags.clear()'), false)
  assert.equal(sideMenu.includes('正在强力清空所有分类关联'), false)
  assert.match(sideMenu, /new AbortController\(\)/)
  assert.match(sideMenu, /classificationAbortController\?\.abort/)
  assert.match(sideMenu, /getReadme\([\s\S]*classificationSignal/)
  assert.match(sideMenu, /signal: classificationSignal/)
  assert.match(sideMenu, /onUnmounted\([\s\S]*component_unmounted/)

  assert.match(aiService, /await onBatchComplete\(/)
  assert.match(aiService, /fetchWithTimeout/)
  assert.match(aiService, /'success' \| 'partial' \| 'failed' \| 'cancelled'/)

  assert.match(settings, /clearAIAPIKey/)
  assert.match(settings, /requestTimeoutMs|20_000/)
})
