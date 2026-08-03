import type { AIConfig } from '@/config/ai'
import { DEFAULT_BASE_URLS } from '@/config/ai'

export class AIEndpointValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIEndpointValidationError'
  }
}

function isPrivateIPv4(hostname: string): boolean {
  const octets = hostname.split('.').map(value => Number(value))
  if (octets.length !== 4 || octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) {
    return false
  }

  const [first, second] = octets
  return first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
}

function isLocalOrPrivateHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  return normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === '::1' ||
    (normalized.includes(':') && normalized.startsWith('fc')) ||
    (normalized.includes(':') && normalized.startsWith('fd')) ||
    (normalized.includes(':') && normalized.startsWith('fe80:')) ||
    isPrivateIPv4(normalized)
}

export interface ResolvedAIEndpoint {
  baseURL: string
  host: string
  isCustom: boolean
}

export function resolveAIEndpoint(config: Pick<AIConfig, 'provider' | 'baseURL'>): ResolvedAIEndpoint {
  const customBaseURL = config.baseURL?.trim() || ''
  const rawBaseURL = customBaseURL || DEFAULT_BASE_URLS[config.provider]
  let url: URL

  try {
    url = new URL(rawBaseURL)
  } catch {
    throw new AIEndpointValidationError('API 地址格式无效')
  }

  if (url.protocol !== 'https:') {
    throw new AIEndpointValidationError('AI API 地址必须使用 HTTPS')
  }
  if (url.username || url.password) {
    throw new AIEndpointValidationError('AI API 地址不能包含用户名或密码')
  }
  if (url.search || url.hash) {
    throw new AIEndpointValidationError('AI API 地址不能包含查询参数或片段')
  }
  if (isLocalOrPrivateHost(url.hostname)) {
    throw new AIEndpointValidationError('不能将 AI API Key 发送到本机或私有网络地址')
  }

  return {
    baseURL: url.toString().replace(/\/+$/, ''),
    host: url.host,
    isCustom: Boolean(customBaseURL)
  }
}
