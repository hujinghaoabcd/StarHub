import { defineStore } from 'pinia'
import {
  createClassificationTask,
  deleteClassificationTask,
  errorMessage,
  executeClassificationTask,
  getAcceptedClassificationAssignments,
  getClassificationEvaluationSummary,
  getClassificationReviewPage,
  isAbortError,
  loadClassificationTask,
  markClassificationTaskCommitted,
  recoverInterruptedClassificationTask,
  retryFailedClassificationItems,
  setClassificationReviewItemsAccepted,
  setClassificationTaskStatus,
  updateClassificationReviewItem
} from '@/services/classificationTasks'
import {
  executeClassificationEnhancement,
  getClassificationEnhancementSummary,
  recoverInterruptedClassificationEnhancement,
  reviewEnhancedClassificationItem,
  setClassificationEnhancementStatus
} from '@/services/classificationEnhancement'
import type {
  ClassificationCategory,
  ClassificationEnhancementSummary,
  ClassificationEvaluation,
  ClassificationTask,
  ClassificationTaskSelectionMode,
  Repository
} from '@/types'

let activeController: AbortController | null = null
let activeEnhancementController: AbortController | null = null

export const useClassificationTaskStore = defineStore('classificationTask', {
  state: () => ({
    activeTask: null as ClassificationTask | null,
    running: false,
    enhancing: false,
    loading: false
  }),

  actions: {
    async loadLatest() {
      this.loading = true
      try {
        const recovered = await recoverInterruptedClassificationTask()
        this.activeTask = recovered
          ? await recoverInterruptedClassificationEnhancement(recovered)
          : null
        return this.activeTask
      } finally {
        this.loading = false
      }
    },

    async create(
      repositories: readonly Repository[],
      categories: readonly ClassificationCategory[],
      batchSize: number,
      options?: {
        selectionMode?: ClassificationTaskSelectionMode
        sampleSeed?: number
      }
    ) {
      this.activeTask = await createClassificationTask(
        repositories,
        categories,
        batchSize,
        options
      )
      return this.activeTask
    },

    async run(
      repositories: readonly Repository[],
      categories: readonly ClassificationCategory[]
    ) {
      if (!this.activeTask || this.running || this.enhancing) return this.activeTask
      this.running = true
      const controller = new AbortController()
      activeController = controller
      const taskId = this.activeTask.id

      try {
        const completedTask = await executeClassificationTask(
          taskId,
          repositories,
          categories,
          controller.signal,
          task => {
            if (this.activeTask?.id === taskId) {
              this.activeTask = task
            }
          }
        )
        if (this.activeTask?.id === taskId) {
          this.activeTask = completedTask
        }
        return this.activeTask
      } catch (error) {
        if (!isAbortError(error) && !controller.signal.aborted) {
          this.activeTask = await setClassificationTaskStatus(
            taskId,
            'paused',
            errorMessage(error)
          )
          throw error
        }
        const persistedTask = await loadClassificationTask(taskId)
        if (this.activeTask?.id === taskId) {
          this.activeTask = persistedTask
        }
        return this.activeTask
      } finally {
        if (activeController === controller) {
          activeController = null
          this.running = false
        }
      }
    },

    async pause() {
      if (!this.activeTask) return
      this.activeTask = await setClassificationTaskStatus(
        this.activeTask.id,
        'paused'
      )
      activeController?.abort('user_paused')
    },

    async enhancementSummary(): Promise<ClassificationEnhancementSummary | null> {
      if (!this.activeTask) return null
      return getClassificationEnhancementSummary(this.activeTask.id)
    },

    async enhance(
      repositories: readonly Repository[],
      categories: readonly ClassificationCategory[]
    ) {
      if (!this.activeTask || this.running || this.enhancing) return this.activeTask
      this.enhancing = true
      const controller = new AbortController()
      activeEnhancementController = controller
      const taskId = this.activeTask.id
      try {
        const task = await executeClassificationEnhancement(
          taskId,
          repositories,
          categories,
          controller.signal,
          updated => {
            if (this.activeTask?.id === taskId) this.activeTask = updated
          }
        )
        if (this.activeTask?.id === taskId) this.activeTask = task
        return this.activeTask
      } catch (error) {
        if (!controller.signal.aborted && this.activeTask?.id === taskId) {
          this.activeTask = await setClassificationEnhancementStatus(
            taskId,
            'paused'
          )
        }
        throw error
      } finally {
        if (activeEnhancementController === controller) {
          activeEnhancementController = null
          this.enhancing = false
        }
      }
    },

    async pauseEnhancement() {
      if (!this.activeTask) return
      this.activeTask = await setClassificationEnhancementStatus(
        this.activeTask.id,
        'paused'
      )
      activeEnhancementController?.abort('user_paused_readme_enhancement')
    },

    async reviewEnhancedItem(
      repositoryId: number,
      evaluation: ClassificationEvaluation
    ) {
      if (!this.activeTask) return
      this.activeTask = await reviewEnhancedClassificationItem(
        this.activeTask.id,
        repositoryId,
        evaluation
      )
    },

    async cancel() {
      if (!this.activeTask) return
      this.activeTask = await setClassificationTaskStatus(
        this.activeTask.id,
        'cancelled'
      )
      activeController?.abort('user_cancelled')
      activeEnhancementController?.abort('user_cancelled')
    },

    async retryFailures(
      repositories: readonly Repository[],
      categories: readonly ClassificationCategory[]
    ) {
      if (!this.activeTask || this.running) return this.activeTask
      this.activeTask = await retryFailedClassificationItems(this.activeTask.id)
      return this.run(repositories, categories)
    },

    async discard() {
      if (!this.activeTask) return
      activeController?.abort('task_discarded')
      activeEnhancementController?.abort('task_discarded')
      const id = this.activeTask.id
      await deleteClassificationTask(id)
      this.activeTask = null
      this.running = false
      this.enhancing = false
    },

    async reviewPage(page: number, pageSize: number) {
      if (!this.activeTask) return []
      return getClassificationReviewPage(this.activeTask.id, page, pageSize)
    },

    async evaluationSummary() {
      if (!this.activeTask) return null
      return getClassificationEvaluationSummary(this.activeTask.id)
    },

    async updateReviewItem(
      repositoryId: number,
      updates: {
        categoryId?: string
        accepted?: boolean
        evaluation?: ClassificationEvaluation | null
      }
    ) {
      if (!this.activeTask) return
      this.activeTask = await updateClassificationReviewItem(
        this.activeTask.id,
        repositoryId,
        updates
      )
    },

    async setReviewItemsAccepted(
      repositoryIds: readonly number[],
      accepted: boolean
    ) {
      if (!this.activeTask) return
      this.activeTask = await setClassificationReviewItemsAccepted(
        this.activeTask.id,
        repositoryIds,
        accepted
      )
    },

    async acceptedAssignments() {
      if (!this.activeTask) return []
      return getAcceptedClassificationAssignments(this.activeTask.id)
    },

    async markCommitted(count: number) {
      if (!this.activeTask) return
      this.activeTask = await markClassificationTaskCommitted(
        this.activeTask.id,
        count
      )
    }
  }
})
