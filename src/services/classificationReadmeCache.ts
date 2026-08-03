import { githubApi } from '@/api/github'
import { isAxiosError, type AxiosResponse } from 'axios'
import { db } from '@/db'
import { buildClassificationReadmeExcerpt } from '@/services/classificationReadmeExcerpt'
import type { ClassificationReadmeCache, Repository } from '@/types'

const MAX_GITHUB_README_ATTEMPTS = 2

function abortError(): Error {
  const error = new Error('README request cancelled')
  error.name = 'AbortError'
  return error
}

async function abortableDelay(milliseconds: number, signal: AbortSignal) {
  if (signal.aborted) throw abortError()
  await new Promise<void>((resolve, reject) => {
    const finish = () => {
      signal.removeEventListener('abort', cancel)
      resolve()
    }
    const timeoutId = window.setTimeout(finish, milliseconds)
    const cancel = () => {
      window.clearTimeout(timeoutId)
      signal.removeEventListener('abort', cancel)
      reject(abortError())
    }
    signal.addEventListener('abort', cancel, { once: true })
  })
}

async function fetchReadmeWithRetry(
  owner: string,
  name: string,
  signal: AbortSignal
): Promise<AxiosResponse<string>> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_GITHUB_README_ATTEMPTS; attempt++) {
    try {
      return await githubApi.getReadme(owner, name, signal)
    } catch (error) {
      if (signal.aborted) throw abortError()
      lastError = error
      const status = isAxiosError(error) ? error.response?.status : undefined
      const remaining = isAxiosError(error)
        ? error.response?.headers?.['x-ratelimit-remaining']
        : undefined
      if (status === 403 && String(remaining) === '0') {
        const reset = isAxiosError(error)
          ? Number(error.response?.headers?.['x-ratelimit-reset'])
          : Number.NaN
        const resetLabel = Number.isFinite(reset)
          ? new Date(reset * 1_000).toLocaleString()
          : '稍后'
        throw new Error(`GitHub API 配额已用尽，请在 ${resetLabel} 后重试`)
      }
      const retryable = status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504
      if (!retryable || attempt === MAX_GITHUB_README_ATTEMPTS) break
      const retryAfter = isAxiosError(error)
        ? Number(error.response?.headers?.['retry-after'])
        : Number.NaN
      const waitMs = Number.isFinite(retryAfter)
        ? Math.min(10_000, Math.max(1_000, retryAfter * 1_000))
        : attempt * 1_500
      await abortableDelay(waitMs, signal)
    }
  }
  throw lastError
}

async function ensureDatabaseOpen() {
  if (!db.isOpen()) await db.open()
}

export async function getCachedClassificationReadme(
  repository: Repository
): Promise<ClassificationReadmeCache | null> {
  await ensureDatabaseOpen()
  const cached = await db.classificationReadmeCache.get(repository.id)
  if (
    !cached ||
    cached.fullName !== repository.full_name ||
    cached.repositoryPushedAt !== repository.pushed_at
  ) {
    return null
  }
  return cached
}

export async function getClassificationReadmeSummary(
  repository: Repository,
  signal: AbortSignal
): Promise<ClassificationReadmeCache> {
  const cached = await getCachedClassificationReadme(repository)
  if (cached) return cached

  const [owner, name, ...extra] = repository.full_name.split('/')
  if (!owner || !name || extra.length > 0) {
    throw new Error(`仓库名称无效：${repository.full_name}`)
  }

  const response = await fetchReadmeWithRetry(owner, name, signal)
  if (signal.aborted) {
    throw abortError()
  }
  const excerpt = buildClassificationReadmeExcerpt(
    typeof response.data === 'string' ? response.data : String(response.data || '')
  )
  if (!excerpt.summary) {
    throw new Error('README 没有可用于分类的文本内容')
  }

  const entry: ClassificationReadmeCache = {
    repositoryId: repository.id,
    fullName: repository.full_name,
    repositoryPushedAt: repository.pushed_at,
    summary: excerpt.summary,
    sourceLength: excerpt.sourceLength,
    truncated: excerpt.truncated ? 1 : 0,
    fetchedAt: Date.now()
  }
  await db.classificationReadmeCache.put(entry)
  return entry
}
