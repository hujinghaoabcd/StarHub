import {
  DEFAULT_MODELS,
  getAIConfig,
  type AIConfig
} from '@/config/ai'
import type {
  ClassificationAssignment,
  ClassificationCategory,
  Repository
} from '@/types'
import { resolveAIEndpoint } from '@/utils/aiEndpoint'
import {
  buildClassificationCategoryMap,
  extractClassificationItems,
  parseClassificationResponse,
  validateClassificationItems
} from '@/services/classificationValidation'

export type ClassificationRunStatus =
  | 'success'
  | 'partial'
  | 'failed'
  | 'cancelled'

export interface ClassificationBatchFailure {
  batchIndex: number
  repositoryIds: number[]
  reason: string
}

export interface ClassificationRunResult {
  status: ClassificationRunStatus
  assignments: ClassificationAssignment[]
  categoryMap: Map<string, number[]>
  completedBatches: number
  totalBatches: number
  failures: ClassificationBatchFailure[]
}

export interface ClassificationRunOptions {
  categories: ClassificationCategory[]
  signal?: AbortSignal
  requestTimeoutMs?: number
}

interface AIMessage {
  role: 'system' | 'user'
  content: string
}

interface JsonSchema {
  type: string
  additionalProperties?: boolean
  required?: string[]
  properties?: Record<string, unknown>
  items?: unknown
  enum?: string[]
  minimum?: number
  maximum?: number
}

const DEFAULT_AI_REQUEST_TIMEOUT_MS = 60_000
const MAX_REASON_LENGTH = 500

class AIRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds?: number
  ) {
    super(message)
    this.name = 'AIRequestError'
  }
}

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

async function abortableDelay(
  milliseconds: number,
  signal?: AbortSignal
): Promise<void> {
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

function classificationResponseSchema(
  categories: readonly ClassificationCategory[]
): JsonSchema {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['classifications'],
    properties: {
      classifications: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'repository_id',
            'category_id',
            'confidence',
            'reason'
          ],
          properties: {
            repository_id: { type: 'integer' },
            category_id: {
              type: 'string',
              enum: categories.map(category => category.categoryId)
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1
            },
            reason: {
              type: 'string',
              maxLength: MAX_REASON_LENGTH
            }
          }
        }
      }
    }
  }
}

function outputTokenBudget(repositoryCount: number): number {
  return Math.min(8_000, Math.max(1_500, repositoryCount * 160))
}

async function assertSuccessfulResponse(
  response: Response,
  providerLabel: string
): Promise<void> {
  if (response.ok) return

  const retryAfterHeader = response.headers.get('retry-after')
  const retryAfter = retryAfterHeader
    ? Number.parseInt(retryAfterHeader, 10)
    : Number.NaN
  const body = (await response.text()).slice(0, 1_000)
  throw new AIRequestError(
    `${providerLabel} API request failed: ${response.status} ${body}`,
    response.status,
    Number.isFinite(retryAfter) ? retryAfter : undefined
  )
}

async function callOpenAICompatible(
  messages: AIMessage[],
  config: AIConfig,
  baseURL: string,
  model: string,
  schema: JsonSchema,
  repositoryCount: number,
  options: Required<Pick<ClassificationRunOptions, 'requestTimeoutMs'>> &
    ClassificationRunOptions
): Promise<string> {
  const structuredFormat = config.provider === 'openai'
    ? {
        type: 'json_schema',
        json_schema: {
          name: 'repository_classification',
          strict: true,
          schema
        }
      }
    : { type: 'json_object' }
  const tokenParameter = config.provider === 'openai' || config.provider === 'qwen'
    ? { max_completion_tokens: outputTokenBudget(repositoryCount) }
    : { max_tokens: outputTokenBudget(repositoryCount) }

  const response = await fetchWithTimeout(
    `${baseURL}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        response_format: structuredFormat,
        ...tokenParameter
      })
    },
    options.requestTimeoutMs,
    options.signal
  )

  await assertSuccessfulResponse(response, config.provider)
  const data = await response.json() as {
    choices?: Array<{ message?: { content?: unknown } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error(`${config.provider} API response did not contain text content`)
  }
  return content
}

async function callClaude(
  messages: AIMessage[],
  config: AIConfig,
  baseURL: string,
  model: string,
  schema: JsonSchema,
  repositoryCount: number,
  options: Required<Pick<ClassificationRunOptions, 'requestTimeoutMs'>> &
    ClassificationRunOptions
): Promise<string> {
  const systemMessage = messages.find(message => message.role === 'system')
  const userMessages = messages.filter(message => message.role !== 'system')
  const response = await fetchWithTimeout(
    `${baseURL}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: outputTokenBudget(repositoryCount),
        system: systemMessage?.content || '',
        messages: userMessages,
        output_config: {
          format: {
            type: 'json_schema',
            schema
          }
        }
      })
    },
    options.requestTimeoutMs,
    options.signal
  )

  await assertSuccessfulResponse(response, 'Claude')
  const data = await response.json() as {
    content?: Array<{ type?: string; text?: unknown }>
  }
  const textBlock = data.content?.find(block => block.type === 'text')
  if (typeof textBlock?.text !== 'string') {
    throw new Error('Claude API response did not contain text content')
  }
  return textBlock.text
}

export async function classifyRepositories(
  repos: Repository[],
  onProgress?: (current: number, total: number) => void,
  batchSize?: number,
  runOptions?: ClassificationRunOptions
): Promise<ClassificationRunResult> {
  const config = getAIConfig()
  if (!config.apiKey) {
    throw new Error('请先配置 AI API Key')
  }

  const categories = runOptions?.categories || []
  if (categories.length === 0) {
    throw new Error('没有可用的分类注册表，请先创建或同步实际分类')
  }

  const categoryIds = categories.map(category => category.categoryId)
  if (new Set(categoryIds).size !== categoryIds.length) {
    throw new Error('分类注册表包含重复的 category_id')
  }

  const { baseURL } = resolveAIEndpoint(config)
  const model = config.model || DEFAULT_MODELS[config.provider]
  const options = {
    ...runOptions,
    categories,
    requestTimeoutMs:
      runOptions?.requestTimeoutMs || DEFAULT_AI_REQUEST_TIMEOUT_MS
  }
  const resolvedBatchSize = Math.min(
    100,
    Math.max(1, batchSize || config.batchSize || 50)
  )
  const totalBatches = Math.ceil(repos.length / resolvedBatchSize)
  const assignments: ClassificationAssignment[] = []
  const failures: ClassificationBatchFailure[] = []
  let completedBatches = 0

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    if (options.signal?.aborted) break
    const start = batchIndex * resolvedBatchSize
    const batchRepos = repos.slice(start, start + resolvedBatchSize)
    onProgress?.(batchIndex + 1, totalBatches)

    let batchAssignments: ClassificationAssignment[] | null = null
    for (let attempt = 1; attempt <= 3 && !batchAssignments; attempt++) {
      try {
        batchAssignments = await classifyBatch(
          batchRepos,
          config,
          baseURL,
          model,
          categories,
          options
        )
      } catch (error) {
        if (isAbortError(error) || options.signal?.aborted) break

        const shouldRetry = error instanceof AIRequestError &&
          error.status === 429 &&
          attempt < 3
        if (shouldRetry) {
          const waitSeconds = error.retryAfterSeconds || 30
          await abortableDelay(waitSeconds * 1_000, options.signal)
          continue
        }

        failures.push({
          batchIndex: batchIndex + 1,
          repositoryIds: batchRepos.map(repository => repository.id),
          reason: error instanceof Error ? error.message : String(error)
        })
        break
      }
    }

    if (options.signal?.aborted) break
    if (batchAssignments) {
      assignments.push(...batchAssignments)
      completedBatches++
    }
  }

  const status: ClassificationRunStatus = options.signal?.aborted
    ? 'cancelled'
    : failures.length === 0
      ? 'success'
      : completedBatches === 0
        ? 'failed'
        : 'partial'

  return {
    status,
    assignments,
    categoryMap: buildClassificationCategoryMap(assignments),
    completedBatches,
    totalBatches,
    failures
  }
}

async function classifyBatch(
  repos: Repository[],
  config: AIConfig,
  baseURL: string,
  model: string,
  categories: ClassificationCategory[],
  options: Required<Pick<ClassificationRunOptions, 'requestTimeoutMs'>> &
    ClassificationRunOptions
): Promise<ClassificationAssignment[]> {
  const categoryRegistry = categories.map(category => ({
    category_id: category.categoryId,
    name: category.name,
    description: category.description,
    examples: category.examples,
    exclusions: category.exclusions
  }))
  const repositoryInfo = repos.map(repository => {
    const readme = (repository as Repository & { readme?: string }).readme
    return {
      repository_id: repository.id,
      name: repository.name,
      full_name: repository.full_name,
      description: repository.description || '',
      language: repository.language || '',
      topics: repository.topics || [],
      ...(readme
        ? { readme_preview: readme.slice(0, 800) }
        : {})
    }
  })
  const systemPrompt = `You classify GitHub repositories into an existing category registry.

Rules:
1. Return exactly one classification for every repository_id in the input.
2. category_id must be copied exactly from the supplied registry. Never invent, translate, or rename a category_id.
3. confidence must be a number from 0 to 1.
4. reason must be concise, evidence-based, and no longer than ${MAX_REASON_LENGTH} characters.
5. Return only a JSON object matching the requested schema. Do not add markdown or commentary.`
  const userPrompt = `Category registry (JSON):
${JSON.stringify(categoryRegistry)}

Repositories (JSON):
${JSON.stringify(repositoryInfo)}`
  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]
  const schema = classificationResponseSchema(categories)
  const responseText = config.provider === 'claude'
    ? await callClaude(
        messages,
        config,
        baseURL,
        model,
        schema,
        repos.length,
        options
      )
    : await callOpenAICompatible(
        messages,
        config,
        baseURL,
        model,
        schema,
        repos.length,
        options
      )

  const parsed = parseClassificationResponse(responseText)
  return validateClassificationItems(
    repos.map(repository => repository.id),
    categories.map(category => category.categoryId),
    extractClassificationItems(parsed)
  )
}
