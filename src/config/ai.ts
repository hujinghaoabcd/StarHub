// AI 配置
export interface AIConfig {
  provider: 'openai' | 'claude' | 'qwen' | 'zhipu' | 'deepseek'
  apiKey: string
  baseURL?: string
  model?: string
  batchSize?: number // 分类批次大小，默认 50
}

type AIConfigPreferences = Omit<AIConfig, 'apiKey'>

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface AIConfigStorageOptions {
  sessionStorage?: StorageLike | null
  persistentStorage?: StorageLike | null
}

const AI_CONFIG_STORAGE_KEY = 'ai_config'
const AI_API_KEY_SESSION_KEY = 'ai_api_key'

// 默认配置
export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'openai',
  apiKey: '',
  baseURL: '',
  model: '',
  batchSize: 50 // 默认批次大小
}

// 各平台默认模型
export const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  claude: 'claude-sonnet-4-6',
  qwen: 'qwen-plus',
  zhipu: 'glm-4-flash',
  deepseek: 'deepseek-chat'
}

// 各平台默认 API 地址
export const DEFAULT_BASE_URLS = {
  openai: 'https://api.openai.com/v1',
  claude: 'https://api.anthropic.com/v1',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  deepseek: 'https://api.deepseek.com/v1'
}

function getBrowserStorage(type: 'sessionStorage' | 'localStorage'): StorageLike | null {
  if (typeof window === 'undefined') return null

  try {
    return window[type]
  } catch {
    return null
  }
}

function normalizePreferences(value: unknown): AIConfigPreferences {
  const candidate = value && typeof value === 'object'
    ? value as Partial<AIConfig>
    : {}
  const provider = typeof candidate.provider === 'string' &&
    Object.prototype.hasOwnProperty.call(DEFAULT_BASE_URLS, candidate.provider)
    ? candidate.provider as AIConfig['provider']
    : DEFAULT_AI_CONFIG.provider
  const batchSize = Number.isFinite(candidate.batchSize)
    ? Math.min(100, Math.max(1, Math.trunc(candidate.batchSize as number)))
    : DEFAULT_AI_CONFIG.batchSize

  return {
    provider,
    baseURL: typeof candidate.baseURL === 'string' ? candidate.baseURL.trim() : '',
    model: typeof candidate.model === 'string' ? candidate.model.trim() : '',
    batchSize
  }
}

export function createAIConfigStorage({
  sessionStorage,
  persistentStorage
}: AIConfigStorageOptions) {
  let memoryApiKey = ''
  let memoryPreferences = normalizePreferences(DEFAULT_AI_CONFIG)

  function savePreferences(preferences: AIConfigPreferences) {
    memoryPreferences = normalizePreferences(preferences)
    try {
      persistentStorage?.setItem(
        AI_CONFIG_STORAGE_KEY,
        JSON.stringify(memoryPreferences)
      )
    } catch {
      // Storage may be unavailable in privacy mode; keep this tab functional.
    }
  }

  function get(): AIConfig {
    let storedPreferences: Partial<AIConfig> | null = null

    try {
      const stored = persistentStorage?.getItem(AI_CONFIG_STORAGE_KEY)
      if (stored) storedPreferences = JSON.parse(stored) as Partial<AIConfig>
    } catch (error) {
      console.error('Failed to parse AI config:', error)
    }

    const preferences = normalizePreferences(storedPreferences || memoryPreferences)
    let apiKey = memoryApiKey

    try {
      apiKey = sessionStorage?.getItem(AI_API_KEY_SESSION_KEY) || apiKey
    } catch {
      // Fall back to memory for the current tab.
    }

    // One-time migration: remove legacy persistent API keys immediately.
    if (!apiKey && typeof storedPreferences?.apiKey === 'string') {
      apiKey = storedPreferences.apiKey
      memoryApiKey = apiKey
      try {
        if (apiKey) sessionStorage?.setItem(AI_API_KEY_SESSION_KEY, apiKey)
      } catch {
        // The in-memory copy remains available for this tab.
      }
    }

    if (storedPreferences && Object.prototype.hasOwnProperty.call(storedPreferences, 'apiKey')) {
      savePreferences(preferences)
    } else {
      memoryPreferences = preferences
    }

    return { ...preferences, apiKey }
  }

  function save(config: AIConfig) {
    const preferences = normalizePreferences(config)
    savePreferences(preferences)
    memoryApiKey = config.apiKey.trim()

    try {
      if (memoryApiKey) {
        sessionStorage?.setItem(AI_API_KEY_SESSION_KEY, memoryApiKey)
      } else {
        sessionStorage?.removeItem(AI_API_KEY_SESSION_KEY)
      }
    } catch {
      // The in-memory copy remains available for this tab.
    }
  }

  function clearKey() {
    memoryApiKey = ''
    try {
      sessionStorage?.removeItem(AI_API_KEY_SESSION_KEY)
    } catch {
      // Nothing else to clear when storage is blocked.
    }

    // Also scrub any legacy key that may still be present.
    try {
      const stored = persistentStorage?.getItem(AI_CONFIG_STORAGE_KEY)
      if (stored) savePreferences(normalizePreferences(JSON.parse(stored)))
    } catch {
      savePreferences(memoryPreferences)
    }
  }

  return { get, save, clearKey }
}

const browserAIConfigStorage = createAIConfigStorage({
  sessionStorage: getBrowserStorage('sessionStorage'),
  persistentStorage: getBrowserStorage('localStorage')
})

export function getAIConfig(): AIConfig {
  return browserAIConfigStorage.get()
}

export function saveAIConfig(config: AIConfig): void {
  browserAIConfigStorage.save(config)
}

export function clearAIAPIKey(): void {
  browserAIConfigStorage.clearKey()
}

// 检查 AI 配置是否完整
export function isAIConfigured(): boolean {
  const config = getAIConfig()
  return !!config.apiKey && !!config.provider
}
