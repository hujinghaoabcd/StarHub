import type {
  ClassificationEvaluationSummary,
  ClassificationTaskItem
} from '@/types'

export function buildClassificationEvaluationSummary(
  items: readonly ClassificationTaskItem[],
  confidenceThreshold = 0.65
): ClassificationEvaluationSummary {
  let correctCount = 0
  let incorrectCount = 0
  let lowConfidenceCount = 0
  const correctionCounts = new Map<string, number>()

  for (const item of items) {
    if (item.status !== 'success') continue
    if ((item.confidence ?? 0) < confidenceThreshold) lowConfidenceCount++
    if (item.evaluation === 'correct') correctCount++
    if (item.evaluation === 'incorrect') {
      incorrectCount++
      if (
        item.modelCategoryId &&
        item.categoryId &&
        item.modelCategoryId !== item.categoryId
      ) {
        const key = `${item.modelCategoryId}\u0000${item.categoryId}`
        correctionCounts.set(key, (correctionCounts.get(key) || 0) + 1)
      }
    }
  }

  const evaluatedCount = correctCount + incorrectCount
  const successfulCount = items.filter(item => item.status === 'success').length
  const corrections = [...correctionCounts.entries()]
    .map(([key, count]) => {
      const [modelCategoryId, reviewedCategoryId] = key.split('\u0000')
      return { modelCategoryId, reviewedCategoryId, count }
    })
    .sort((left, right) =>
      right.count - left.count ||
      left.modelCategoryId.localeCompare(right.modelCategoryId) ||
      left.reviewedCategoryId.localeCompare(right.reviewedCategoryId)
    )

  return {
    evaluatedCount,
    correctCount,
    incorrectCount,
    unreviewedCount: Math.max(0, successfulCount - evaluatedCount),
    lowConfidenceCount,
    accuracy: evaluatedCount > 0 ? correctCount / evaluatedCount : null,
    corrections
  }
}
