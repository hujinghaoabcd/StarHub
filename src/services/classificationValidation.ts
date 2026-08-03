import type { ClassificationAssignment } from '@/types'

interface ClassificationItem {
  repository_id?: unknown
  category_id?: unknown
  confidence?: unknown
  reason?: unknown
}

interface ClassificationEnvelope {
  classifications?: unknown
}

export function parseClassificationResponse(value: string): unknown {
  const text = value.trim()
  if (!text) {
    throw new Error('AI 返回了空响应')
  }

  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    throw new Error(`AI 返回的 JSON 格式错误，已拒绝自动修补: ${String(error)}`)
  }
}

export function extractClassificationItems(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('AI 返回的数据格式错误：顶层必须是 JSON 对象')
  }

  return (value as ClassificationEnvelope).classifications
}

export function validateClassificationItems(
  expectedRepositoryIds: readonly number[],
  allowedCategoryIds: readonly string[],
  value: unknown
): ClassificationAssignment[] {
  if (!Array.isArray(value)) {
    throw new Error('AI 返回的数据格式错误：缺少 classifications 数组')
  }

  const expectedIds = new Set(expectedRepositoryIds)
  const allowedIds = new Set(allowedCategoryIds)
  const seenIds = new Set<number>()
  const assignments: ClassificationAssignment[] = []

  for (const rawItem of value) {
    const item = rawItem && typeof rawItem === 'object'
      ? rawItem as ClassificationItem
      : {}
    const repoId = typeof item.repository_id === 'number'
      ? item.repository_id
      : Number.NaN
    const categoryId = typeof item.category_id === 'string'
      ? item.category_id.trim()
      : ''
    const confidence = typeof item.confidence === 'number'
      ? item.confidence
      : Number.NaN
    const reason = typeof item.reason === 'string'
      ? item.reason.trim()
      : ''

    if (!Number.isSafeInteger(repoId) || !expectedIds.has(repoId)) {
      throw new Error(
        `AI 返回了当前批次之外或无效的仓库 ID: ${String(item.repository_id)}`
      )
    }
    if (seenIds.has(repoId)) {
      throw new Error(`AI 重复返回仓库 ID: ${repoId}`)
    }
    if (!categoryId || !allowedIds.has(categoryId)) {
      throw new Error(`仓库 ${repoId} 返回了未知分类 ID: ${categoryId || '(空)'}`)
    }
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new Error(`仓库 ${repoId} 的置信度必须在 0 到 1 之间`)
    }
    if (!reason || reason.length > 500) {
      throw new Error(`仓库 ${repoId} 缺少有效理由或理由超过 500 字符`)
    }

    seenIds.add(repoId)
    assignments.push({
      repositoryId: repoId,
      categoryId,
      confidence,
      reason
    })
  }

  const missingIds = expectedRepositoryIds.filter(repoId => !seenIds.has(repoId))
  if (missingIds.length > 0) {
    const preview = missingIds.slice(0, 10).join(', ')
    const suffix = missingIds.length > 10 ? '…' : ''
    throw new Error(`AI 分类结果不完整，缺少仓库 ID: ${preview}${suffix}`)
  }

  return assignments
}

export function buildClassificationCategoryMap(
  assignments: readonly ClassificationAssignment[]
): Map<string, number[]> {
  const categoryMap = new Map<string, number[]>()
  for (const assignment of assignments) {
    if (!categoryMap.has(assignment.categoryId)) {
      categoryMap.set(assignment.categoryId, [])
    }
    categoryMap.get(assignment.categoryId)!.push(assignment.repositoryId)
  }
  return categoryMap
}
