import { getAIConfig, DEFAULT_MODELS } from '@/config/ai'
import type { Repository } from '@/types'
import { resolveAIEndpoint } from '@/utils/aiEndpoint'
import { validateClassificationItems } from '@/services/classificationValidation'

export interface ClassificationResult {
  category: string
  color: string
  confidence: number
}

export type ClassificationRunStatus = 'success' | 'partial' | 'failed' | 'cancelled'

export interface ClassificationBatchFailure {
  batchIndex: number
  repositoryIds: number[]
  reason: string
}

export interface ClassificationRunResult {
  status: ClassificationRunStatus
  categoryMap: Map<string, number[]>
  completedBatches: number
  totalBatches: number
  failures: ClassificationBatchFailure[]
}

export interface ClassificationRunOptions {
  signal?: AbortSignal
  requestTimeoutMs?: number
}

const DEFAULT_AI_REQUEST_TIMEOUT_MS = 60_000

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError'
}

function createAbortError(reason = 'Classification cancelled'): Error {
  const error = new Error(reason)
  error.name = 'AbortError'
  return error
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw createAbortError(
      typeof signal.reason === 'string' ? signal.reason : undefined
    )
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<Response> {
  throwIfAborted(signal)
  const controller = new AbortController()
  let timedOut = false
  const timeoutId = window.setTimeout(() => {
    timedOut = true
    controller.abort(createAbortError('AI request timed out'))
  }, timeoutMs)
  const abortFromCaller = () => {
    controller.abort(createAbortError('Classification cancelled'))
  }
  signal?.addEventListener('abort', abortFromCaller, { once: true })

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (timedOut && !signal?.aborted) {
      throw new Error(`AI request timed out after ${timeoutMs}ms`)
    }
    if (signal?.aborted) {
      throw createAbortError('Classification cancelled')
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}

async function abortableDelay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal)

  await new Promise<void>((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }
    const timeoutId = window.setTimeout(finish, milliseconds)
    const handleAbort = () => {
      window.clearTimeout(timeoutId)
      signal?.removeEventListener('abort', handleAbort)
      reject(createAbortError('Classification cancelled'))
    }
    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}

// 调用 OpenAI 兼容 API
async function callOpenAICompatible(
  messages: any[],
  apiKey: string,
  baseURL: string,
  model: string,
  options: Required<Pick<ClassificationRunOptions, 'requestTimeoutMs'>> & ClassificationRunOptions
): Promise<string> {
  const response = await fetchWithTimeout(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 2000
    })
  }, options.requestTimeoutMs, options.signal)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API request failed: ${response.status} ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// 调用 Claude API
async function callClaude(
  messages: any[],
  apiKey: string,
  baseURL: string,
  model: string,
  options: Required<Pick<ClassificationRunOptions, 'requestTimeoutMs'>> & ClassificationRunOptions
): Promise<string> {
  // 提取 system message
  const systemMessage = messages.find(m => m.role === 'system')
  const userMessages = messages.filter(m => m.role !== 'system')

  const response = await fetchWithTimeout(`${baseURL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: systemMessage?.content || '',
      messages: userMessages
    })
  }, options.requestTimeoutMs, options.signal)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Claude API request failed: ${response.status} ${error}`)
  }

  const data = await response.json()
  return data.content[0].text
}

// 调用智谱 AI
async function callZhipu(
  messages: any[],
  apiKey: string,
  baseURL: string,
  model: string,
  options: Required<Pick<ClassificationRunOptions, 'requestTimeoutMs'>> & ClassificationRunOptions
): Promise<string> {
  const response = await fetchWithTimeout(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 2000
    })
  }, options.requestTimeoutMs, options.signal)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Zhipu API request failed: ${response.status} ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// 批量分类仓库（自动分批处理）
export async function classifyRepositories(
  repos: Repository[],
  onProgress?: (current: number, total: number) => void,
  onBatchComplete?: (batchResult: Map<string, number[]>, batchIndex: number, totalBatches: number) => Promise<void>,
  batchSize?: number, // 可配置的批次大小
  runOptions: ClassificationRunOptions = {}
): Promise<ClassificationRunResult> {
  const config = getAIConfig()
  
  if (!config.apiKey) {
    throw new Error('请先配置 AI API Key')
  }

  const { baseURL } = resolveAIEndpoint(config)
  const model = config.model || DEFAULT_MODELS[config.provider]
  const options = {
    ...runOptions,
    requestTimeoutMs: runOptions.requestTimeoutMs || DEFAULT_AI_REQUEST_TIMEOUT_MS
  }
  
  // 分批处理：使用配置的批次大小，默认 50
  const BATCH_SIZE = batchSize || config.batchSize || 50
  const totalBatches = Math.ceil(repos.length / BATCH_SIZE)
  const allCategoryMap = new Map<string, number[]>()
  const failures: ClassificationBatchFailure[] = []
  let completedBatches = 0
  
  console.log(`开始分类 ${repos.length} 个仓库，分 ${totalBatches} 批处理（每批 ${BATCH_SIZE} 个）...`)
  
  // 获取现有分类（用于 AI 参考）
  let existingCategories: string[] = []
  try {
    const { useTagStore } = await import('@/stores/tag')
    const tagStore = useTagStore()
    existingCategories = tagStore.tags.map((t: any) => t.name)
    console.log('现有分类:', existingCategories)
  } catch (e) {
    console.warn('无法获取现有分类:', e)
  }
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    if (options.signal?.aborted) break
    const start = batchIndex * BATCH_SIZE
    const end = Math.min(start + BATCH_SIZE, repos.length)
    const batchRepos = repos.slice(start, end)
    
    console.log(`处理第 ${batchIndex + 1}/${totalBatches} 批 (${start}-${end})...`)
    
    // 通知进度
    if (onProgress) {
      onProgress(batchIndex + 1, totalBatches)
    }
    
    // 重试机制：最多重试 3 次
    let retryCount = 0
    let success = false
    let batchResult: Map<string, number[]> | null = null
    
    while (retryCount < 3 && !success) {
      try {
        batchResult = await classifyBatch(
          batchRepos,
          config,
          baseURL,
          model,
          existingCategories,
          options
        )
        success = true
      } catch (error: any) {
        if (isAbortError(error) || options.signal?.aborted) break

        // 检查是否是速率限制错误
        if (error.message && error.message.includes('429')) {
          const waitTime = extractWaitTime(error.message)
          console.warn(`第 ${batchIndex + 1} 批遇到速率限制，等待 ${waitTime} 秒后重试...`)
          
          // 通知进度（暂停状态）
          if (onProgress) {
            onProgress(batchIndex, totalBatches)
          }
          
          try {
            await abortableDelay(waitTime * 1000, options.signal)
          } catch (delayError) {
            if (!isAbortError(delayError)) throw delayError
            break
          }
          retryCount++
        } else {
          console.error(`第 ${batchIndex + 1} 批处理失败:`, error)
          failures.push({
            batchIndex: batchIndex + 1,
            repositoryIds: batchRepos.map(repo => repo.id),
            reason: error instanceof Error ? error.message : String(error)
          })
          break
        }
      }
    }

    if (options.signal?.aborted) break

    if (!success && retryCount >= 3) {
      failures.push({
        batchIndex: batchIndex + 1,
        repositoryIds: batchRepos.map(repo => repo.id),
        reason: 'API rate limit retries exhausted'
      })
    }

    if (success && batchResult) {
      try {
        // Persistence must finish before the next batch starts.
        if (onBatchComplete) {
          await onBatchComplete(batchResult, batchIndex + 1, totalBatches)
        }

        for (const [category, repoIds] of batchResult.entries()) {
          if (!allCategoryMap.has(category)) allCategoryMap.set(category, [])
          allCategoryMap.get(category)!.push(...repoIds)
        }

        completedBatches++
        console.log(`第 ${batchIndex + 1} 批完成，已分类: ${batchResult.size} 个类别`)
      } catch (error) {
        console.error(`第 ${batchIndex + 1} 批写入失败:`, error)
        failures.push({
          batchIndex: batchIndex + 1,
          repositoryIds: batchRepos.map(repo => repo.id),
          reason: error instanceof Error ? error.message : String(error)
        })
      }
    }
    
    // 每批之间间隔（根据 API 提供商调整）
    const delayTime = getDelayTime(config.provider)
    if (batchIndex < totalBatches - 1 && !options.signal?.aborted) {
      console.log(`等待 ${delayTime} 秒后处理下一批...`)
      try {
        await abortableDelay(delayTime * 1000, options.signal)
      } catch (error) {
        if (!isAbortError(error)) throw error
        break
      }
    }
  }

  const status: ClassificationRunStatus = options.signal?.aborted
    ? 'cancelled'
    : failures.length === 0
      ? 'success'
      : completedBatches === 0
        ? 'failed'
        : 'partial'

  console.log(`分类任务结束，状态: ${status}`)
  console.log('最终分类统计:', Object.fromEntries(
    Array.from(allCategoryMap.entries()).map(([k, v]) => [k, v.length])
  ))
  
  return {
    status,
    categoryMap: allCategoryMap,
    completedBatches,
    totalBatches,
    failures
  }
}

// 分类单个批次
async function classifyBatch(
  repos: Repository[],
  config: any,
  baseURL: string,
  model: string,
  existingCategories: string[] = [],
  options: Required<Pick<ClassificationRunOptions, 'requestTimeoutMs'>> & ClassificationRunOptions
): Promise<Map<string, number[]>> {

  // 从用户设置中获取当前的分类预设（而不是默认配置）
  const { getCategoryPresets } = await import('@/config/categories')
  const presets = getCategoryPresets()
  
  // 获取当前语言
  const currentLang = localStorage.getItem('app-language') || localStorage.getItem('app-locale') || 'zh'
  const isZh = currentLang === 'zh' || currentLang === 'zh-CN'
  
  // 构建分类列表：使用用户当前设置的预设分类
  // 根据当前语言显示对应的名称和描述
  const presetCategories = presets.map(p => {
    const name = isZh ? p.name : (p.nameEn || p.name)
    const description = isZh ? p.description : (p.descriptionEn || p.description)
    const emoji = p.emoji ? `${p.emoji} ` : ''
    return description ? `${emoji}${name} - ${description}` : `${emoji}${name}`
  })
  
  // 获取预设分类的纯名称列表（用于去重）
  const presetNames = presets.map(p => p.name)
  
  // 合并用户通过 UI 创建的额外分类（不在预设中的）
  const userCategories = existingCategories.filter(cat => !presetNames.includes(cat))
  
  // 最终分类列表：用户额外创建的分类 + 预设分类
  const allCategories = [...userCategories, ...presetCategories]
  const categoryList = allCategories.map((cat, idx) => `${idx + 1}. ${cat}`).join('\n')
  
  // 构建 prompt
  const systemPrompt = `你是一个专业的代码仓库分类专家。请根据仓库的以下信息进行智能分类：

**参考信息：**
1. **仓库名称 (name/full_name)** - 项目名称通常能反映项目类型
2. **描述 (description)** - 项目简介，最重要的分类依据
3. **编程语言 (language)** - 主要使用的编程语言
4. **标签 (topics)** - GitHub 标签，反映项目特征
5. **README 预览 (readme_preview)** - 如果提供，包含项目文档的前 500 字符

**预设分类的关键词仅供参考**，你需要根据仓库的实际特征智能判断，而不是简单的关键词匹配。

可用的分类类别：
${categoryList}

**分类原则：**
1. 优先使用前面列出的自定义分类（如果仓库特征匹配）
2. 综合分析所有信息，特别是 description 和 readme_preview
3. 返回的 id 必须是仓库的真实 id 值，不是数组索引
4. category 只返回分类名称部分（如 "Web 开发"），不要包含后面的描述

请严格按照以下 JSON 格式返回分类结果（确保 JSON 格式正确）：
{
  "classifications": [
    {"id": 123456789, "category": "Web 开发"},
    {"id": 987654321, "category": "工具库"}
  ]
}

只返回有效的 JSON，不要有其他文字说明。`

  // 准备仓库信息
  const repoInfo = repos.map((repo: Repository) => {
    const info: any = {
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description || '无描述',
      language: repo.language || '未知',
      topics: repo.topics?.join(', ') || '无标签'
    }
    
    // 如果仓库有 README 内容，添加前 500 个字符（避免 token 过多）
    if ((repo as any).readme) {
      const readmePreview = (repo as any).readme.substring(0, 500)
      info.readme_preview = readmePreview + (readmePreview.length >= 500 ? '...' : '')
    }
    
    return info
  })

  const userPrompt = `请对以下仓库进行分类：\n\n${JSON.stringify(repoInfo, null, 2)}`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]

  // 根据不同的 provider 调用相应的 API
  let responseText: string
  
  if (config.provider === 'claude') {
    responseText = await callClaude(messages, config.apiKey, baseURL, model, options)
  } else if (config.provider === 'zhipu') {
    responseText = await callZhipu(messages, config.apiKey, baseURL, model, options)
  } else {
    // OpenAI, Qwen, DeepSeek 等都使用 OpenAI 兼容接口
    responseText = await callOpenAICompatible(messages, config.apiKey, baseURL, model, options)
  }

  // 解析响应
  console.log('AI Response (first 500 chars):', responseText.substring(0, 500))
  
  // 提取 JSON（处理可能的 markdown 代码块）
  let jsonText = responseText.trim()
  
  // 移除可能的 markdown 代码块标记
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
  }
  
  // 尝试找到 JSON 对象
  const jsonMatch = jsonText.match(/\{[\s\S]*/)
  if (!jsonMatch) {
    throw new Error('AI 返回格式错误：未找到有效的 JSON')
  }

  let jsonString = jsonMatch[0]
  
  // 尝试修复不完整的 JSON（如果被截断）
  if (!jsonString.endsWith('}')) {
    console.warn('JSON 似乎被截断，尝试自动修复...')
    
    // 移除最后一个可能不完整的对象
    const lastCompleteObject = jsonString.lastIndexOf('},')
    if (lastCompleteObject > 0) {
      jsonString = jsonString.substring(0, lastCompleteObject + 1)
    }
    
    // 补全缺失的结束标记
    const openBrackets = (jsonString.match(/\[/g) || []).length
    const closeBrackets = (jsonString.match(/\]/g) || []).length
    const openBraces = (jsonString.match(/\{/g) || []).length
    const closeBraces = (jsonString.match(/\}/g) || []).length
    
    // 添加缺失的 ]
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      jsonString += ']'
    }
    
    // 添加缺失的 }
    for (let i = 0; i < openBraces - closeBraces; i++) {
      jsonString += '}'
    }
    
    console.log('修复后的 JSON (last 200 chars):', jsonString.slice(-200))
  }

  let result
  try {
    result = JSON.parse(jsonString)
  } catch (e) {
    console.error('JSON parse error:', e)
    console.error('Raw JSON (last 500 chars):', jsonString.slice(-500))
    throw new Error(`AI 返回的 JSON 格式错误: ${e}`)
  }
  
  console.log('Parsed result:', result)
  console.log('Classifications count:', result.classifications?.length)
  
  // 止损校验：任何遗漏、重复、未知或无效 ID 都会使整批失败，禁止写库。
  const categoryMap = validateClassificationItems(
    repos.map(repo => repo.id),
    result.classifications
  )
  
  console.log('Category map:', Object.fromEntries(categoryMap))
  console.log('Total categories:', categoryMap.size)

  return categoryMap
}

// 从错误消息中提取等待时间
function extractWaitTime(errorMessage: string): number {
  // 尝试从错误消息中提取等待时间
  // 格式: "Please try again in 20s" 或 "Please try again in 14h0m14.399s"
  
  const secondsMatch = errorMessage.match(/try again in (\d+)s/)
  if (secondsMatch) {
    return Math.ceil(parseInt(secondsMatch[1]) + 2) // 额外加 2 秒缓冲
  }
  
  const minutesMatch = errorMessage.match(/try again in (\d+)m/)
  if (minutesMatch) {
    return Math.ceil(parseInt(minutesMatch[1]) * 60 + 5) // 额外加 5 秒缓冲
  }
  
  const hoursMatch = errorMessage.match(/try again in (\d+)h/)
  if (hoursMatch) {
    // 如果需要等待小时级别，返回 60 秒，然后提示用户切换 API
    console.error('需要等待时间过长（小时级别），建议切换到其他 API 提供商')
    return 60
  }
  
  // 默认等待 30 秒
  return 30
}

// 根据 API 提供商获取延迟时间
function getDelayTime(provider: string): number {
  switch (provider) {
    case 'openai':
      return 25 // OpenAI 免费账户每分钟 3 次，所以至少等 20 秒
    case 'claude':
      return 5
    case 'qwen':
    case 'zhipu':
    case 'deepseek':
      return 2 // 国内 API 通常限制更宽松
    default:
      return 3
  }
}

// 预定义的分类颜色
export const CATEGORY_COLORS: Record<string, string> = {
  'Web 开发': '#42b883',
  '移动开发': '#34a853',
  '数据科学': '#ff9800',
  '工具库': '#9c27b0',
  'DevOps': '#00bcd4',
  '游戏开发': '#f44336',
  '数据库': '#ff5722',
  '安全': '#e91e63',
  '区块链': '#ffc107',
  '编程语言': '#3f51b5',
  '系统编程': '#607d8b',
  '设计': '#e91e63',
  '文档': '#795548',
  '测试': '#4caf50',
  '其他': '#9e9e9e'
}
