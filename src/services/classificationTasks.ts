import { DEFAULT_MODELS, getAIConfig } from '@/config/ai'
import { db } from '@/db'
import {
  classifyRepositories,
  isAbortError,
  type ClassificationBatchFailure
} from '@/services/ai'
import {
  CLASSIFICATION_PROMPT_VERSION,
  estimateClassificationUsage
} from '@/services/classificationProtocol'
import { buildClassificationRegistryVersion } from '@/services/classificationRegistry'
import type {
  ClassificationAssignment,
  ClassificationCategory,
  ClassificationTask,
  ClassificationTaskItem,
  ClassificationTaskStatus,
  Repository
} from '@/types'

const CONFIDENCE_THRESHOLD = 0.65
const TASK_ITEM_WRITE_CHUNK_SIZE = 1_000

async function ensureDatabaseOpen() {
  if (!db.isOpen()) await db.open()
}

function taskId(): string {
  return `ai_task_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export async function createClassificationTask(
  repositories: readonly Repository[],
  categories: readonly ClassificationCategory[],
  batchSize: number
): Promise<ClassificationTask> {
  await ensureDatabaseOpen()
  const config = getAIConfig()
  const model = config.model || DEFAULT_MODELS[config.provider]
  const resolvedBatchSize = Math.min(100, Math.max(1, Math.trunc(batchSize)))
  const usage = estimateClassificationUsage(
    repositories,
    categories,
    resolvedBatchSize
  )
  const now = Date.now()
  const task: ClassificationTask = {
    id: taskId(),
    status: 'paused',
    provider: config.provider,
    model,
    batchSize: resolvedBatchSize,
    registryVersion: buildClassificationRegistryVersion(categories),
    promptVersion: CLASSIFICATION_PROMPT_VERSION,
    totalCount: repositories.length,
    processedCount: 0,
    successCount: 0,
    failedCount: 0,
    acceptedCount: 0,
    estimatedBatches: usage.batchCount,
    estimatedInputTokens: usage.estimatedInputTokens,
    estimatedOutputTokens: usage.estimatedOutputTokens,
    createdAt: now,
    updatedAt: now
  }
  const items: ClassificationTaskItem[] = repositories.map(repository => ({
    taskId: task.id,
    repositoryId: repository.id,
    status: 'pending',
    attempts: 0,
    accepted: 0,
    updatedAt: now
  }))

  await db.transaction(
    'rw',
    db.classificationTasks,
    db.classificationTaskItems,
    async () => {
      await db.classificationTasks.add(task)
      for (let start = 0; start < items.length; start += TASK_ITEM_WRITE_CHUNK_SIZE) {
        await db.classificationTaskItems.bulkAdd(
          items.slice(start, start + TASK_ITEM_WRITE_CHUNK_SIZE)
        )
      }
    }
  )

  return task
}

export async function loadLatestClassificationTask(): Promise<ClassificationTask | null> {
  await ensureDatabaseOpen()
  return await db.classificationTasks.orderBy('updatedAt').last() || null
}

export async function loadClassificationTask(
  id: string
): Promise<ClassificationTask | null> {
  await ensureDatabaseOpen()
  return await db.classificationTasks.get(id) || null
}

export async function recoverInterruptedClassificationTask(): Promise<ClassificationTask | null> {
  const task = await loadLatestClassificationTask()
  if (!task || task.status !== 'running') return task

  return setClassificationTaskStatus(
    task.id,
    'paused',
    'The page was closed while classification was running. Resume when ready.'
  )
}

export async function setClassificationTaskStatus(
  id: string,
  status: ClassificationTaskStatus,
  lastError?: string
): Promise<ClassificationTask> {
  await ensureDatabaseOpen()
  await db.classificationTasks.update(id, {
    status,
    updatedAt: Date.now(),
    lastError
  })
  const updated = await db.classificationTasks.get(id)
  if (!updated) throw new Error('Classification task no longer exists')
  return updated
}

export async function deleteClassificationTask(id: string): Promise<void> {
  await ensureDatabaseOpen()
  await db.transaction(
    'rw',
    db.classificationTasks,
    db.classificationTaskItems,
    async () => {
      await db.classificationTaskItems.where('taskId').equals(id).delete()
      await db.classificationTasks.delete(id)
    }
  )
}

export async function getPendingClassificationTaskItems(
  id: string,
  limit: number
): Promise<ClassificationTaskItem[]> {
  await ensureDatabaseOpen()
  return db.classificationTaskItems
    .where('[taskId+status]')
    .equals([id, 'pending'])
    .limit(limit)
    .toArray()
}

export async function saveClassificationBatchResult(
  id: string,
  repositoryIds: readonly number[],
  assignments: readonly ClassificationAssignment[],
  failures: readonly ClassificationBatchFailure[]
): Promise<ClassificationTask> {
  await ensureDatabaseOpen()
  const now = Date.now()
  const assignmentById = new Map(
    assignments.map(assignment => [assignment.repositoryId, assignment])
  )
  const failureById = new Map<number, string>()
  for (const failure of failures) {
    for (const repositoryId of failure.repositoryIds) {
      failureById.set(repositoryId, failure.reason)
    }
  }

  return db.transaction(
    'rw',
    db.classificationTasks,
    db.classificationTaskItems,
    async () => {
      const task = await db.classificationTasks.get(id)
      if (!task) throw new Error('Classification task no longer exists')
      const keys = repositoryIds.map(repositoryId => [id, repositoryId] as [string, number])
      const existingItems = await db.classificationTaskItems.bulkGet(keys)
      let successDelta = 0
      let failedDelta = 0
      let processedDelta = 0
      let acceptedDelta = 0
      const updatedItems: ClassificationTaskItem[] = []

      for (const item of existingItems) {
        if (!item) continue
        const assignment = assignmentById.get(item.repositoryId)
        const failure = failureById.get(item.repositoryId)
        const wasProcessed = item.status !== 'pending'
        const wasSuccess = item.status === 'success'
        const wasFailed = item.status === 'failed'
        const wasAccepted = item.accepted === 1
        const accepted = assignment && assignment.confidence >= CONFIDENCE_THRESHOLD
          ? 1 as const
          : 0 as const
        const next: ClassificationTaskItem = assignment
          ? {
              ...item,
              status: 'success',
              categoryId: assignment.categoryId,
              confidence: assignment.confidence,
              reason: assignment.reason,
              error: undefined,
              attempts: item.attempts + 1,
              accepted,
              updatedAt: now
            }
          : {
              ...item,
              status: 'failed',
              categoryId: undefined,
              confidence: undefined,
              reason: undefined,
              error: failure || 'AI returned no validated result for this repository',
              attempts: item.attempts + 1,
              accepted: 0,
              updatedAt: now
            }

        if (!wasProcessed) processedDelta++
        if (!wasSuccess && next.status === 'success') successDelta++
        if (wasSuccess && next.status !== 'success') successDelta--
        if (!wasFailed && next.status === 'failed') failedDelta++
        if (wasFailed && next.status !== 'failed') failedDelta--
        if (!wasAccepted && next.accepted === 1) acceptedDelta++
        if (wasAccepted && next.accepted === 0) acceptedDelta--
        updatedItems.push(next)
      }

      if (updatedItems.length > 0) {
        await db.classificationTaskItems.bulkPut(updatedItems)
      }
      const lastFailure = failures.length > 0
        ? failures[failures.length - 1].reason
        : undefined
      const updatedTask: ClassificationTask = {
        ...task,
        processedCount: task.processedCount + processedDelta,
        successCount: task.successCount + successDelta,
        failedCount: task.failedCount + failedDelta,
        acceptedCount: task.acceptedCount + acceptedDelta,
        updatedAt: now,
        lastError: lastFailure || task.lastError
      }
      await db.classificationTasks.put(updatedTask)
      return updatedTask
    }
  )
}

export async function getClassificationReviewPage(
  id: string,
  page: number,
  pageSize: number
): Promise<ClassificationTaskItem[]> {
  await ensureDatabaseOpen()
  const safePage = Math.max(1, Math.trunc(page))
  const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)))
  return db.classificationTaskItems
    .where('[taskId+status]')
    .equals([id, 'success'])
    .offset((safePage - 1) * safePageSize)
    .limit(safePageSize)
    .toArray()
}

export async function updateClassificationReviewItem(
  id: string,
  repositoryId: number,
  updates: { categoryId?: string; accepted?: boolean }
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
      if (!task || !item || item.status !== 'success') {
        throw new Error('Classification review item no longer exists')
      }
      const accepted = updates.accepted === undefined
        ? item.accepted
        : updates.accepted ? 1 : 0
      const categoryId = updates.categoryId || item.categoryId
      if (!categoryId) throw new Error('A category is required')
      const acceptedDelta = accepted - item.accepted
      const now = Date.now()
      await db.classificationTaskItems.put({
        ...item,
        categoryId,
        accepted: accepted as 0 | 1,
        updatedAt: now
      })
      const updatedTask = {
        ...task,
        acceptedCount: task.acceptedCount + acceptedDelta,
        updatedAt: now
      }
      await db.classificationTasks.put(updatedTask)
      return updatedTask
    }
  )
}

export async function setClassificationReviewItemsAccepted(
  id: string,
  repositoryIds: readonly number[],
  accepted: boolean
): Promise<ClassificationTask> {
  await ensureDatabaseOpen()
  return db.transaction(
    'rw',
    db.classificationTasks,
    db.classificationTaskItems,
    async () => {
      const task = await db.classificationTasks.get(id)
      if (!task) throw new Error('Classification task no longer exists')
      const keys = repositoryIds.map(repositoryId => [id, repositoryId] as [string, number])
      const items = await db.classificationTaskItems.bulkGet(keys)
      const nextAccepted = accepted ? 1 : 0
      let acceptedDelta = 0
      const now = Date.now()
      const updatedItems = items.flatMap(item => {
        if (!item || item.status !== 'success' || item.accepted === nextAccepted) {
          return []
        }
        acceptedDelta += nextAccepted - item.accepted
        return [{ ...item, accepted: nextAccepted as 0 | 1, updatedAt: now }]
      })
      if (updatedItems.length > 0) {
        await db.classificationTaskItems.bulkPut(updatedItems)
      }
      const updatedTask = {
        ...task,
        acceptedCount: task.acceptedCount + acceptedDelta,
        updatedAt: now
      }
      await db.classificationTasks.put(updatedTask)
      return updatedTask
    }
  )
}

export async function getAcceptedClassificationAssignments(
  id: string
): Promise<ClassificationAssignment[]> {
  await ensureDatabaseOpen()
  const items = await db.classificationTaskItems
    .where('[taskId+accepted]')
    .equals([id, 1])
    .toArray()
  return items.flatMap(item =>
    item.status === 'success' &&
    item.categoryId &&
    item.confidence !== undefined &&
    item.reason !== undefined
      ? [{
          repositoryId: item.repositoryId,
          categoryId: item.categoryId,
          confidence: item.confidence,
          reason: item.reason
        }]
      : []
  )
}

export async function retryFailedClassificationItems(
  id: string
): Promise<ClassificationTask> {
  await ensureDatabaseOpen()
  return db.transaction(
    'rw',
    db.classificationTasks,
    db.classificationTaskItems,
    async () => {
      const task = await db.classificationTasks.get(id)
      if (!task) throw new Error('Classification task no longer exists')
      if (task.committedAt) {
        throw new Error('Committed classification tasks cannot be retried')
      }
      const failedItems = await db.classificationTaskItems
        .where('[taskId+status]')
        .equals([id, 'failed'])
        .toArray()
      const now = Date.now()
      if (failedItems.length > 0) {
        await db.classificationTaskItems.bulkPut(failedItems.map(item => ({
          ...item,
          status: 'pending' as const,
          error: undefined,
          accepted: 0 as const,
          updatedAt: now
        })))
      }
      const updatedTask: ClassificationTask = {
        ...task,
        status: 'paused',
        processedCount: Math.max(0, task.processedCount - failedItems.length),
        failedCount: Math.max(0, task.failedCount - failedItems.length),
        lastError: undefined,
        updatedAt: now
      }
      await db.classificationTasks.put(updatedTask)
      return updatedTask
    }
  )
}

export async function markClassificationTaskCommitted(
  id: string,
  committedCount: number
): Promise<ClassificationTask> {
  await ensureDatabaseOpen()
  const now = Date.now()
  await db.classificationTasks.update(id, {
    status: 'committed',
    committedAt: now,
    committedCount,
    lastError: undefined,
    updatedAt: now
  })
  const updated = await db.classificationTasks.get(id)
  if (!updated) throw new Error('Classification task no longer exists')
  return updated
}

export function assertClassificationTaskCompatible(
  task: ClassificationTask,
  categories: readonly ClassificationCategory[]
): void {
  assertClassificationReviewCompatible(task, categories)
  const config = getAIConfig()
  const model = config.model || DEFAULT_MODELS[config.provider]
  if (config.provider !== task.provider || model !== task.model) {
    throw new Error(
      `This task requires ${task.provider}/${task.model}. Restore that AI configuration or start a new task.`
    )
  }
}

export function assertClassificationReviewCompatible(
  task: ClassificationTask,
  categories: readonly ClassificationCategory[]
): void {
  if (task.committedAt) {
    throw new Error('This classification task has already been committed')
  }
  if (task.promptVersion !== CLASSIFICATION_PROMPT_VERSION) {
    throw new Error('The classification prompt changed. Start a new task to avoid mixing incompatible results.')
  }
  if (task.registryVersion !== buildClassificationRegistryVersion(categories)) {
    throw new Error('Categories changed after this task started. Start a new task to protect result consistency.')
  }
}

export async function executeClassificationTask(
  id: string,
  repositories: readonly Repository[],
  categories: readonly ClassificationCategory[],
  signal: AbortSignal,
  onUpdate?: (task: ClassificationTask) => void
): Promise<ClassificationTask> {
  let task = await loadClassificationTask(id)
  if (!task) throw new Error('Classification task no longer exists')
  assertClassificationTaskCompatible(task, categories)
  task = await setClassificationTaskStatus(id, 'running')
  onUpdate?.(task)
  const repositoriesById = new Map(
    repositories.map(repository => [repository.id, repository])
  )

  while (!signal.aborted) {
    const pendingItems = await getPendingClassificationTaskItems(id, task.batchSize)
    if (pendingItems.length === 0) break
    const pendingIds = pendingItems.map(item => item.repositoryId)
    const batchRepositories = pendingIds.flatMap(repositoryId => {
      const repository = repositoriesById.get(repositoryId)
      return repository ? [repository] : []
    })
    const missingIds = pendingIds.filter(repositoryId => !repositoriesById.has(repositoryId))
    const failures: ClassificationBatchFailure[] = missingIds.length > 0
      ? [{
          batchIndex: 1,
          repositoryIds: missingIds,
          reason: 'Repository metadata is no longer available locally'
        }]
      : []
    let assignments: ClassificationAssignment[] = []

    if (batchRepositories.length > 0) {
      const result = await classifyRepositories(
        batchRepositories,
        undefined,
        batchRepositories.length,
        {
          categories: [...categories],
          signal,
          requestTimeoutMs: 60_000,
          expectedProvider: task.provider,
          expectedModel: task.model
        }
      )
      if (result.status === 'cancelled' || signal.aborted) break
      assignments = result.assignments
      failures.push(...result.failures)

      if (result.status === 'failed') {
        task = await saveClassificationBatchResult(
          id,
          pendingIds,
          assignments,
          failures
        )
        const failureReason = result.failures[result.failures.length - 1]?.reason ||
          'AI returned no validated result for this batch'
        task = await setClassificationTaskStatus(
          id,
          'paused',
          `任务已自动暂停：本批次没有任何有效结果。${failureReason}`
        )
        onUpdate?.(task)
        return task
      }
    }

    task = await saveClassificationBatchResult(
      id,
      pendingIds,
      assignments,
      failures
    )
    onUpdate?.(task)
  }

  if (signal.aborted) {
    return await loadClassificationTask(id) || task
  }
  const status: ClassificationTaskStatus = task.failedCount > 0
    ? 'partial'
    : 'completed'
  task = await setClassificationTaskStatus(id, status, task.lastError)
  onUpdate?.(task)
  return task
}

export { errorMessage, isAbortError }
