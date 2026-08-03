export type OpenAICompatibleProvider =
  | 'openai'
  | 'qwen'
  | 'zhipu'
  | 'deepseek'

export type AIOutputFailureCode =
  | 'empty_output'
  | 'truncated_output'
  | 'blocked_output'
  | 'transient_output'
  | 'invalid_output'

export class AIOutputError extends Error {
  constructor(
    message: string,
    readonly code: AIOutputFailureCode,
    readonly canSplit = false
  ) {
    super(message)
    this.name = 'AIOutputError'
  }
}

interface AIMessage {
  role: 'system' | 'user'
  content: string
}

interface OpenAICompatibleRequestOptions {
  provider: OpenAICompatibleProvider
  model: string
  messages: AIMessage[]
  schema: object
  maxOutputTokens: number
}

interface OpenAICompatibleChoice {
  finish_reason?: unknown
  message?: {
    content?: unknown
    reasoning_content?: unknown
  }
}

interface OpenAICompatibleResponse {
  choices?: unknown
}

export function isDeepSeekV4Model(
  provider: OpenAICompatibleProvider,
  model: string
): boolean {
  return provider === 'deepseek' && /^deepseek-v4(?:-|$)/i.test(model.trim())
}

export function buildOpenAICompatibleRequestBody(
  options: OpenAICompatibleRequestOptions
): Record<string, unknown> {
  const structuredFormat = options.provider === 'openai'
    ? {
        type: 'json_schema',
        json_schema: {
          name: 'repository_classification',
          strict: true,
          schema: options.schema
        }
      }
    : { type: 'json_object' }
  const tokenParameter = options.provider === 'openai' || options.provider === 'qwen'
    ? { max_completion_tokens: options.maxOutputTokens }
    : { max_tokens: options.maxOutputTokens }

  return {
    model: options.model,
    messages: options.messages,
    temperature: 0.2,
    response_format: structuredFormat,
    ...tokenParameter,
    ...(isDeepSeekV4Model(options.provider, options.model)
      ? { thinking: { type: 'disabled' } }
      : {})
  }
}

export function extractOpenAICompatibleText(
  value: unknown,
  provider: OpenAICompatibleProvider
): string {
  const envelope = value && typeof value === 'object'
    ? value as OpenAICompatibleResponse
    : {}
  const choices = Array.isArray(envelope.choices)
    ? envelope.choices as OpenAICompatibleChoice[]
    : []
  const choice = choices[0]
  const finishReason = typeof choice?.finish_reason === 'string'
    ? choice.finish_reason
    : ''
  const content = choice?.message?.content
  const reasoningContent = choice?.message?.reasoning_content

  if (finishReason === 'length') {
    throw new AIOutputError(
      `${provider} 输出达到长度限制，JSON 可能已被截断；将缩小批次后重试`,
      'truncated_output',
      true
    )
  }
  if (finishReason === 'content_filter') {
    throw new AIOutputError(
      `${provider} 拒绝了本批次输出（content_filter）`,
      'blocked_output'
    )
  }
  if (finishReason === 'insufficient_system_resource') {
    throw new AIOutputError(
      `${provider} 暂时没有足够的系统资源生成结果`,
      'transient_output'
    )
  }
  if (finishReason && finishReason !== 'stop') {
    throw new AIOutputError(
      `${provider} 以非预期状态结束输出（finish_reason: ${finishReason}）`,
      'invalid_output'
    )
  }

  if (typeof content !== 'string' || content.trim() === '') {
    const usedReasoningBudget = typeof reasoningContent === 'string' &&
      reasoningContent.trim() !== ''
    throw new AIOutputError(
      usedReasoningBudget
        ? `${provider} 只返回了思考内容，最终 JSON 为空；将缩小批次后重试`
        : `${provider} API 返回了空的最终内容；将缩小批次后重试`,
      'empty_output',
      true
    )
  }

  return content
}
