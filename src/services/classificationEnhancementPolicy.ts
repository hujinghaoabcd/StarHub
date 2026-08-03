import type {
  ClassificationEnhancementSummary,
  ClassificationTaskItem
} from '@/types'

export const CLASSIFICATION_ENHANCEMENT_CONFIDENCE_THRESHOLD = 0.65

export function isClassificationEnhancementCandidate(
  item: Pick<
    ClassificationTaskItem,
    | 'status'
    | 'categoryId'
    | 'confidence'
    | 'evaluation'
    | 'enhancementStatus'
    | 'baselineConfidence'
  >,
  threshold = CLASSIFICATION_ENHANCEMENT_CONFIDENCE_THRESHOLD
): boolean {
  return item.status === 'success' &&
    Boolean(item.categoryId) &&
    (Boolean(item.enhancementStatus) ||
      item.evaluation === 'incorrect' ||
      (item.baselineConfidence ?? item.confidence ?? 0) < threshold)
}

export function buildClassificationEnhancementSummary(
  items: readonly ClassificationTaskItem[]
): ClassificationEnhancementSummary {
  const candidates = items.filter(item => isClassificationEnhancementCandidate(item))
  return {
    candidateCount: candidates.length,
    pendingCount: candidates.filter(item =>
      !item.enhancementStatus || item.enhancementStatus === 'pending'
    ).length,
    successCount: candidates.filter(item => item.enhancementStatus === 'success').length,
    failedCount: candidates.filter(item => item.enhancementStatus === 'failed').length,
    reviewedCount: candidates.filter(item => item.enhancementEvaluation).length,
    correctedCount: candidates.filter(item =>
      item.baselineEvaluation === 'incorrect' &&
      item.enhancementEvaluation === 'correct'
    ).length,
    regressionCount: candidates.filter(item =>
      item.baselineEvaluation === 'correct' &&
      item.enhancementEvaluation === 'incorrect'
    ).length,
    changedCount: candidates.filter(item =>
      item.enhancementStatus === 'success' &&
      (item.modelCategoryId || item.baselineCategoryId) !==
        item.enhancedCategoryId
    ).length
  }
}
