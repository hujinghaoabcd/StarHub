interface ClassificationItem {
  id?: unknown
  category?: unknown
}

export function validateClassificationItems(
  expectedRepositoryIds: readonly number[],
  value: unknown
): Map<string, number[]> {
  if (!Array.isArray(value)) {
    throw new Error('AI 返回的数据格式错误：缺少 classifications 数组')
  }

  const expectedIds = new Set(expectedRepositoryIds)
  const seenIds = new Set<number>()
  const categoryMap = new Map<string, number[]>()

  for (const rawItem of value) {
    const item = rawItem && typeof rawItem === 'object'
      ? rawItem as ClassificationItem
      : {}
    const repoId = typeof item.id === 'number'
      ? item.id
      : typeof item.id === 'string'
        ? Number(item.id)
        : Number.NaN
    const category = typeof item.category === 'string'
      ? item.category.trim()
      : ''

    if (!Number.isSafeInteger(repoId) || !expectedIds.has(repoId)) {
      throw new Error(`AI 返回了当前批次之外或无效的仓库 ID: ${String(item.id)}`)
    }
    if (seenIds.has(repoId)) {
      throw new Error(`AI 重复返回仓库 ID: ${repoId}`)
    }
    if (!category) {
      throw new Error(`仓库 ${repoId} 缺少有效分类名称`)
    }

    seenIds.add(repoId)
    if (!categoryMap.has(category)) categoryMap.set(category, [])
    categoryMap.get(category)!.push(repoId)
  }

  const missingIds = expectedRepositoryIds.filter(repoId => !seenIds.has(repoId))
  if (missingIds.length > 0) {
    const preview = missingIds.slice(0, 10).join(', ')
    const suffix = missingIds.length > 10 ? '…' : ''
    throw new Error(`AI 分类结果不完整，缺少仓库 ID: ${preview}${suffix}`)
  }

  return categoryMap
}
