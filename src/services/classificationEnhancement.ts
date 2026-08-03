import { db } from '@/db'
import { classifyRepositories, isAbortError } from '@/services/ai'
import { getClassificationReadmeSummary } from '@/services/classificationReadmeCache'
import { buildClassificationRegistryVersion } from '@/services/classificationRegistry'
import {
  buildClassificationEnhancementSummary,
  isClassificationEnhancementCandidate
} from '@/services/classificationEnhancementPolicy'
import { DEFAULT_MODELS, getAIConfig } from '@/config/ai'
import type {
  ClassificationAssignment,
  ClassificationCategory,
  ClassificationEnhancementSummary,
  ClassificationTask,
  ClassificationTaskItem,
  Repository
} from '@/types'

export const CLASSIFICATION_README_PROMPT_VERSION = 'classification-readme-v1'
const ENHANCEMENT_BATCH_SIZE = 5

async function ensureDatabaseOpen() {
  if (!db.isOpen()) await db.open()
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export async function getClassificationEnhancementSummary(
  id: string
): Promise<ClassificationEnhancementSummary> {
  await ensureDatabaseOpen()
  const items = await db.classificationTaskItems.where('taskId').equals(id).toArray()
  return buildClassificationEnhancementSummary(items)
}

async function setEnhancementTaskState(
  id: string,
  updates: Partial<ClassificationTask>
): Promise<ClassificationTask> {
  await db.classificationTasks.update(id, { ...updates, updatedAt: Date.now() })
  const task = await db.classificationTasks.get(id)
  if (!task) throw new Error('Classification task no longer exists')
  return task
}

export async function recoverInterruptedClassificationEnhancement(
  task: ClassificationTask
): Promise<ClassificationTask> {
  if (task.enhancementStatus !== 'running') return task
  return setEnhancementTaskState(task.id, {
    enhancementStatus: 'paused',
    enhancementLastError: '页面关闭时 README 增强仍在运行，请在审核页继续。'
  })
}

async function prepareEnhancementItems(
  task: ClassificationTask
): Promise<ClassificationTaskItem[]> {
  const allItems = await db.classificationTaskItems
    .where('taskId')
    .equals(task.id)
    .toArray()
  const allCandidates = allItems.filter(item =>
    isClassificationEnhancementCandidate(item)
  )
  const pendingCandidates = allCandidates.filter(item =>
    item.enhancementStatus !== 'success'
  )
  const now = Date.now()

  if (pendingCandidates.length > 0) {
    await db.classificationTaskItems.bulkPut(pendingCandidates.map(item => ({
      ...item,
      enhancementStatus: 'pending' as const,
      enhancementError: undefined,
      enhancementUpdatedAt: now
    })))
  }
  const pendingRepositoryIds = new Set(
    pendingCandidates.map(item => item.repositoryId)
  )
  const summary = buildClassificationEnhancementSummary([
    ...allItems.filter(item => !pendingRepositoryIds.has(item.repositoryId)),
    ...pendingCandidates.map(item => ({
      ...item,
      enhancementStatus: 'pending' as const
    }))
  ])
  await setEnhancementTaskState(task.id, {
    enhancementStatus: 'running',
    enhancementPromptVersion: CLASSIFICATION_README_PROMPT_VERSION,
    enhancementTargetCount: summary.candidateCount,
    enhancementProcessedCount: summary.successCount,
    enhancementSuccessCount: summary.successCount,
    enhancementFailedCount: 0,
    enhancementStartedAt: task.enhancementStartedAt || now,
    enhancementCompletedAt: undefined,
    enhancementLastError: undefined
  })
  return pendingCandidates
}

async function saveEnhancementBatch(
  taskId: string,
  items: readonly ClassificationTaskItem[],
  assignments: readonly ClassificationAssignment[],
  errors: ReadonlyMap<number, string>,
  inputCharacters: number
): Promise<ClassificationTask> {
  const assignmentById = new Map(
    assignments.map(assignment => [assignment.repositoryId, assignment])
  )
  const now = Date.now()
  return db.transaction(
    'rw',
    db.classificationTasks,
    db.classificationTaskItems,
    async () => {
      await db.classificationTaskItems.bulkPut(items.map(item => {
        const assignment = assignmentById.get(item.repositoryId)
        const baselineCategoryId = item.baselineCategoryId || item.categoryId
        if (assignment) {
          return {
            ...item,
            enhancementStatus: 'success' as const,
            baselineCategoryId,
            baselineConfidence: item.baselineConfidence ?? item.confidence,
            baselineReason: item.baselineReason || item.reason,
            baselineEvaluation: item.baselineEvaluation || item.evaluation,
            baselineAccepted: item.baselineAccepted ?? item.accepted,
            enhancedCategoryId: assignment.categoryId,
            enhancedConfidence: assignment.confidence,
            enhancedReason: assignment.reason,
            enhancementEvaluation: undefined,
            enhancementAdopted: 0 as const,
            enhancementError: undefined,
            enhancementUpdatedAt: now
          }
        }
        return {
          ...item,
          enhancementStatus: 'failed' as const,
          baselineCategoryId,
          baselineConfidence: item.baselineConfidence ?? item.confidence,
          baselineReason: item.baselineReason || item.reason,
          baselineEvaluation: item.baselineEvaluation || item.evaluation,
          baselineAccepted: item.baselineAccepted ?? item.accepted,
          enhancementError: errors.get(item.repositoryId) ||
            'README 增强未返回有效结果',
          enhancementUpdatedAt: now
        }
      }))

      const storedItems = await db.classificationTaskItems
        .where('taskId')
        .equals(taskId)
        .toArray()
      const summary = buildClassificationEnhancementSummary(storedItems)
      const task = await db.classificationTasks.get(taskId)
      if (!task) throw new Error('Classification task no longer exists')
      const updated: ClassificationTask = {
        ...task,
        enhancementProcessedCount: summary.successCount + summary.failedCount,
        enhancementSuccessCount: summary.successCount,
        enhancementFailedCount: summary.failedCount,
        enhancementEstimatedInputTokens:
          (task.enhancementEstimatedInputTokens || 0) + Math.ceil(inputCharacters / 4),
        enhancementEstimatedOutputTokens:
          (task.enhancementEstimatedOutputTokens || 0) + assignments.length * 160,
        enhancementLastError: errors.size > 0
          ? Array.from(errors.values())[errors.size - 1]
          : task.enhancementLastError,
        updatedAt: now
      }
      await db.classificationTasks.put(updated)
      return updated
    }
  )
}

export async function executeClassificationEnhancement(
  id: string,
  repositories: readonly Repository[],
  categories: readonly ClassificationCategory[],
  signal: AbortSignal,
  onUpdate?: (task: ClassificationTask) => void
): Promise<ClassificationTask> {
  await ensureDatabaseOpen()
  let task = await db.classificationTasks.get(id)
  if (!task) throw new Error('Classification task no longer exists')
  if (task.committedAt) throw new Error('已写入并结束的任务不能执行 README 增强')
  if (task.status === 'cancelled') throw new Error('已取消的任务不能执行 README 增强')
  if (task.registryVersion !== buildClassificationRegistryVersion(categories)) {
    throw new Error('分类注册表已变化，请新建任务以避免混用不兼容结果')
  }
  if (
    task.enhancementPromptVersion &&
    task.enhancementPromptVersion !== CLASSIFICATION_README_PROMPT_VERSION
  ) {
    throw new Error('README 增强协议已变化，请新建任务')
  }
  const config = getAIConfig()
  const model = config.model || DEFAULT_MODELS[config.provider]
  if (config.provider !== task.provider || model !== task.model) {
    throw new Error(`此任务需要 ${task.provider}/${task.model} 配置`)
  }

  const candidates = await prepareEnhancementItems(task)
  task = await db.classificationTasks.get(id) || task
  onUpdate?.(task)
  if (candidates.length === 0) {
    task = await setEnhancementTaskState(id, {
      enhancementStatus: 'completed',
      enhancementCompletedAt: Date.now()
    })
    onUpdate?.(task)
    return task
  }

  const repositoriesById = new Map(
    repositories.map(repository => [repository.id, repository])
  )
  for (let start = 0; start < candidates.length && !signal.aborted; start += ENHANCEMENT_BATCH_SIZE) {
    const batchItems = candidates.slice(start, start + ENHANCEMENT_BATCH_SIZE)
    const errors = new Map<number, string>()
    const readmeSummaries = new Map<number, string>()
    const baselineAssignments = new Map<number, ClassificationAssignment>()
    const batchRepositories: Repository[] = []

    for (const item of batchItems) {
      if (signal.aborted) break
      const repository = repositoriesById.get(item.repositoryId)
      if (!repository) {
        errors.set(item.repositoryId, '仓库元数据在本地已不存在')
        continue
      }
      try {
        const cached = await getClassificationReadmeSummary(repository, signal)
        readmeSummaries.set(repository.id, cached.summary)
        batchRepositories.push(repository)
        baselineAssignments.set(repository.id, {
          repositoryId: repository.id,
          categoryId: item.modelCategoryId || item.categoryId || '',
          confidence: item.confidence || 0,
          reason: item.reason || ''
        })
      } catch (error) {
        if (isAbortError(error) || signal.aborted) break
        errors.set(item.repositoryId, errorMessage(error))
      }
    }
    if (signal.aborted) break

    let assignments: ClassificationAssignment[] = []
    if (batchRepositories.length > 0) {
      const result = await classifyRepositories(
        batchRepositories,
        undefined,
        ENHANCEMENT_BATCH_SIZE,
        {
          categories: [...categories],
          signal,
          requestTimeoutMs: 60_000,
          expectedProvider: task.provider,
          expectedModel: task.model,
          readmeSummaries,
          baselineAssignments
        }
      )
      if (result.status === 'cancelled' || signal.aborted) break
      assignments = result.assignments
      for (const failure of result.failures) {
        for (const repositoryId of failure.repositoryIds) {
          errors.set(repositoryId, failure.reason)
        }
      }
    }

    task = await saveEnhancementBatch(
      id,
      batchItems,
      assignments,
      errors,
      Array.from(readmeSummaries.values()).reduce(
        (total, summary) => total + summary.length,
        0
      )
    )
    onUpdate?.(task)

    if (batchRepositories.length > 0 && assignments.length === 0) {
      task = await setEnhancementTaskState(id, {
        enhancementStatus: 'paused',
        enhancementLastError:
          `README 增强已自动暂停：${Array.from(errors.values())[errors.size - 1] || '本批没有有效结果'}`
      })
      onUpdate?.(task)
      return task
    }
  }

  if (signal.aborted) return await db.classificationTasks.get(id) || task
  const summary = await getClassificationEnhancementSummary(id)
  task = await setEnhancementTaskState(id, {
    enhancementStatus: summary.failedCount > 0 ? 'partial' : 'completed',
    enhancementCompletedAt: Date.now()
  })
  onUpdate?.(task)
  return task
}

export async function setClassificationEnhancementStatus(
  id: string,
  status: 'paused'
): Promise<ClassificationTask> {
  await ensureDatabaseOpen()
  return setEnhancementTaskState(id, { enhancementStatus: status })
}

export async function reviewEnhancedClassificationItem(
  id: string,
  repositoryId: number,
  evaluation: 'correct' | 'incorrect'
): Promise<ClassificationTask> {
  await ensureDatabaseOpen()
  return db.transaction(
    'rw',
    db.classificationTasks,
    db.classificationTaskItems,
    async () => {
      const key: [string, number] = [id, repositoryId]
      const [task, item] = await Promise.all([
        db.classificationTasks.get(id),
        db.classificationTaskItems.get(key)
      ])
      if (!task || !item || item.enhancementStatus !== 'success') {
        throw new Error('README 增强结果已不存在')
      }
      const adopt = evaluation === 'correct'
      if (
        adopt &&
        (!item.enhancedCategoryId || item.enhancedConfidence === undefined || !item.enhancedReason)
      ) {
        throw new Error('README 增强结果不完整')
      }
      const nextAccepted = adopt ? 1 : item.baselineAccepted ?? item.accepted
      const now = Date.now()
      await db.classificationTaskItems.put({
        ...item,
        ...(adopt ? {
          categoryId: item.enhancedCategoryId,
          confidence: item.enhancedConfidence,
          reason: item.enhancedReason,
          evaluation: 'correct' as const
        } : {
          categoryId: item.baselineCategoryId || item.categoryId,
          confidence: item.baselineConfidence ?? item.confidence,
          reason: item.baselineReason || item.reason,
          evaluation: item.baselineEvaluation
        }),
        enhancementEvaluation: evaluation,
        enhancementAdopted: adopt ? 1 : 0,
        accepted: nextAccepted as 0 | 1,
        enhancementUpdatedAt: now,
        updatedAt: now
      })
      const updatedTask: ClassificationTask = {
        ...task,
        acceptedCount: task.acceptedCount + (nextAccepted - item.accepted),
        updatedAt: now
      }
      await db.classificationTasks.put(updatedTask)
      return updatedTask
    }
  )
}
