<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('tag.taskTitle')"
    width="min(1440px, 96vw)"
    top="3vh"
    :close-on-click-modal="false"
    destroy-on-close
    @close="closeDialog"
  >
    <div class="dialog-scroll-content">
      <template v-if="task">
      <div class="task-summary">
        <div class="task-heading">
          <el-tag :type="statusTagType" effect="plain">
            {{ t(`tag.taskStatus.${task.status}`) }}
          </el-tag>
          <span>{{ task.provider }} / {{ task.model }}</span>
          <span>
            {{ task.autoEnhanceLowConfidence || task.enhancementTargetCount
              ? t('tag.metadataWithReadmeEnhancement')
              : t('tag.metadataOnly') }}
          </span>
          <span v-if="task.selectionMode">
            {{ t('tag.taskScope', {
              mode: t(`tag.taskSelectionMode.${task.selectionMode}`),
              count: task.totalCount
            }) }}
          </span>
          <el-tag v-if="task.segmentSize" type="primary" effect="plain">
            {{ t('tag.segmentProgress', {
              current: currentSegmentNumber,
              total: task.segmentCount || 1,
              processed: task.segmentProcessedCount || 0,
              size: currentSegmentTarget
            }) }}
          </el-tag>
        </div>

        <el-progress
          :percentage="progressPercent"
          :status="task.status === 'completed' || task.status === 'committed' ? 'success' : undefined"
        />

        <div class="task-metrics">
          <span>{{ t('tag.taskProcessed') }} {{ task.processedCount }}/{{ task.totalCount }}</span>
          <span>{{ t('tag.taskSucceeded') }} {{ task.successCount }}</span>
          <span>{{ t('tag.taskFailed') }} {{ task.failedCount }}</span>
          <span>{{ t('tag.taskAccepted') }} {{ task.acceptedCount }}</span>
          <span v-if="task.segmentSize">
            {{ t('tag.segmentCommittedTotal') }} {{ task.committedCount || 0 }}
          </span>
          <span>{{ t('tag.taskBatches') }} {{ task.estimatedBatches }}</span>
          <span>
            {{ t('tag.taskTokenEstimate') }}
            {{ formatNumber(task.estimatedInputTokens + task.estimatedOutputTokens) }}
          </span>
        </div>
      </div>

      <el-alert
        v-if="task.lastError"
        :title="task.lastError"
        type="warning"
        :closable="false"
        show-icon
        class="task-alert"
      />
      <el-alert
        v-if="task.committedAt"
        :title="t('tag.taskCommitted', { count: task.committedCount || 0 })"
        type="success"
        :closable="false"
        show-icon
        class="task-alert"
      />

      <div class="task-actions">
        <el-button
          v-if="task.status === 'running' && !task.committedAt"
          type="warning"
          :loading="actionBusy"
          @click="emit('pause')"
        >
          {{ t('tag.pauseTask') }}
        </el-button>
        <el-button
          v-if="task.status === 'paused' && reviewFailedCount === 0 && !task.committedAt"
          type="primary"
          :loading="actionBusy"
          @click="emit('resume')"
        >
          {{ t('tag.resumeTask') }}
        </el-button>
        <el-button
          v-if="(task.status === 'partial' || task.status === 'paused') && reviewFailedCount > 0 && !task.committedAt"
          type="warning"
          :loading="actionBusy"
          @click="emit('retry')"
        >
          {{ t('tag.retryFailed', { count: reviewFailedCount }) }}
        </el-button>
        <el-button
          v-if="(task.status === 'running' || task.status === 'paused') && !task.committedAt"
          type="danger"
          plain
          :disabled="actionBusy"
          @click="emit('cancel-task')"
        >
          {{ t('tag.cancelTask') }}
        </el-button>
        <el-button
          v-if="task.status === 'cancelled' || task.committedAt"
          plain
          :disabled="actionBusy"
          @click="emit('discard')"
        >
          {{ t('tag.discardTask') }}
        </el-button>
      </div>

      <template v-if="reviewSuccessCount > 0">
        <el-alert
          :title="t('tag.reviewNotice', { threshold: confidenceThresholdPercent })"
          type="warning"
          :closable="false"
          show-icon
          class="review-notice"
        />

        <section class="evaluation-panel">
          <h4>{{ t('tag.evaluationTitle') }}</h4>
          <div class="evaluation-metrics">
            <div class="evaluation-metric accuracy">
              <strong>{{ reviewedAccuracy }}</strong>
              <span>{{ t('tag.evaluationAccuracy') }}</span>
            </div>
            <div class="evaluation-metric">
              <strong>{{ evaluationSummary.evaluatedCount }}</strong>
              <span>{{ t('tag.evaluationEvaluated') }}</span>
            </div>
            <div class="evaluation-metric correct">
              <strong>{{ evaluationSummary.correctCount }}</strong>
              <span>{{ t('tag.evaluationCorrect') }}</span>
            </div>
            <div class="evaluation-metric incorrect">
              <strong>{{ evaluationSummary.incorrectCount }}</strong>
              <span>{{ t('tag.evaluationIncorrect') }}</span>
            </div>
            <div class="evaluation-metric">
              <strong>{{ evaluationSummary.unreviewedCount }}</strong>
              <span>{{ t('tag.evaluationUnreviewed') }}</span>
            </div>
            <div class="evaluation-metric">
              <strong>{{ evaluationSummary.lowConfidenceCount }}</strong>
              <span>{{ t('tag.evaluationLowConfidence') }}</span>
            </div>
          </div>
          <div
            v-if="evaluationSummary.corrections.length > 0"
            class="correction-summary"
          >
            <span>{{ t('tag.evaluationCorrections') }}:</span>
            <el-tag
              v-for="correction in evaluationSummary.corrections.slice(0, 6)"
              :key="`${correction.modelCategoryId}:${correction.reviewedCategoryId}`"
              effect="plain"
            >
              {{ categoryName(correction.modelCategoryId) }}
              → {{ categoryName(correction.reviewedCategoryId) }}
              ×{{ correction.count }}
            </el-tag>
          </div>
          <p
            v-else-if="evaluationSummary.evaluatedCount === 0"
            class="evaluation-empty"
          >
            {{ t('tag.evaluationNoData') }}
          </p>
        </section>

        <section
          v-if="enhancementSummary.candidateCount > 0"
          class="enhancement-panel"
        >
          <div class="enhancement-heading">
            <div>
              <h4>{{ t('tag.enhancementTitle') }}</h4>
              <p>{{ t('tag.enhancementDescription') }}</p>
            </div>
            <div class="enhancement-actions">
              <el-button
                v-if="taskStore.enhancing"
                type="warning"
                :loading="enhancementBusy"
                @click="emit('pause-enhancement')"
              >
                {{ t('tag.enhancementPause') }}
              </el-button>
              <el-button
                v-else-if="enhancementSummary.pendingCount > 0 || enhancementSummary.failedCount > 0"
                type="primary"
                :loading="enhancementBusy"
                :disabled="task.status === 'running' || task.status === 'cancelled' || task.committedAt !== undefined"
                @click="emit('enhance')"
              >
                {{ task.enhancementProcessedCount
                  ? t('tag.enhancementContinue')
                  : t('tag.enhancementStart', { count: enhancementSummary.candidateCount }) }}
              </el-button>
            </div>
          </div>
          <div class="enhancement-metrics">
            <span>{{ t('tag.enhancementCandidates') }} {{ enhancementSummary.candidateCount }}</span>
            <span>{{ t('tag.enhancementSucceeded') }} {{ enhancementSummary.successCount }}</span>
            <span>{{ t('tag.enhancementFailed') }} {{ enhancementSummary.failedCount }}</span>
            <span>{{ t('tag.enhancementChanged') }} {{ enhancementSummary.changedCount }}</span>
            <span>{{ t('tag.enhancementReviewed') }} {{ enhancementSummary.reviewedCount }}</span>
            <span>{{ t('tag.enhancementCorrected') }} {{ enhancementSummary.correctedCount }}</span>
            <span>{{ t('tag.enhancementRegressed') }} {{ enhancementSummary.regressionCount }}</span>
            <span>
              {{ t('tag.enhancementTokenEstimate') }}
              {{ formatNumber(
                (task.enhancementEstimatedInputTokens || 0) +
                  (task.enhancementEstimatedOutputTokens || 0)
              ) }}
            </span>
            <span v-if="task.enhancementStartedAt">
              {{ t('tag.enhancementElapsed') }}
              {{ formatDuration(
                (task.enhancementCompletedAt || task.updatedAt) -
                  task.enhancementStartedAt
              ) }}
            </span>
          </div>
          <el-progress
            v-if="task.enhancementTargetCount"
            :percentage="enhancementProgressPercent"
            :status="task.enhancementStatus === 'completed' ? 'success' : undefined"
          />
          <el-alert
            v-if="task.enhancementLastError"
            :title="task.enhancementLastError"
            type="warning"
            :closable="false"
            show-icon
            class="enhancement-alert"
          />
        </section>

        <div class="review-toolbar">
          <el-checkbox
            :model-value="allPageSelected"
            :indeterminate="pageIndeterminate"
            :disabled="pageItems.length === 0 || task.committedAt !== undefined"
            @change="togglePage"
          >
            {{ t('tag.reviewSelectPage') }}
          </el-checkbox>
          <span>
            {{ t('tag.reviewSelectedCount', {
              selected: task.acceptedCount,
              total: reviewSuccessCount
            }) }}
          </span>
        </div>

        <el-table
          v-loading="pageLoading"
          :data="pageItems"
          row-key="repositoryId"
          max-height="48vh"
          border
          class="review-table"
        >
          <el-table-column width="52" align="center">
            <template #default="{ row }">
              <el-checkbox
                :model-value="row.accepted === 1"
                :aria-label="repositoryName(row.repositoryId)"
                :disabled="task.committedAt !== undefined"
                @change="setAccepted(row.repositoryId, $event)"
              />
            </template>
          </el-table-column>

          <el-table-column
            :label="t('tag.reviewRepository')"
            min-width="220"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ repositoryName(row.repositoryId) }}
            </template>
          </el-table-column>

          <el-table-column :label="t('tag.reviewCategory')" min-width="210">
            <template #default="{ row }">
              <el-select
                :model-value="row.categoryId"
                size="small"
                filterable
                :disabled="task.committedAt !== undefined"
                @update:model-value="setCategory(row, $event)"
              >
                <el-option
                  v-for="category in categories"
                  :key="category.categoryId"
                  :label="category.name"
                  :value="category.categoryId"
                />
              </el-select>
            </template>
          </el-table-column>

          <el-table-column
            :label="t('tag.evaluationLabel')"
            width="130"
            align="center"
          >
            <template #default="{ row }">
              <el-select
                :model-value="row.evaluation || ''"
                size="small"
                clearable
                :disabled="task.committedAt !== undefined"
                @change="setEvaluation(row, $event)"
              >
                <el-option
                  :label="t('tag.evaluationCorrectOption')"
                  value="correct"
                />
                <el-option
                  :label="t('tag.evaluationIncorrectOption')"
                  value="incorrect"
                />
              </el-select>
            </template>
          </el-table-column>

          <el-table-column
            :label="t('tag.reviewConfidence')"
            width="110"
            align="center"
          >
            <template #default="{ row }">
              <el-tag :type="confidenceTagType(row.confidence || 0)" effect="plain">
                {{ Math.round((row.confidence || 0) * 100) }}%
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column
            prop="reason"
            :label="t('tag.reviewReason')"
            min-width="260"
            show-overflow-tooltip
          />

          <el-table-column
            :label="t('tag.enhancementResult')"
            min-width="330"
          >
            <template #default="{ row }">
              <div
                v-if="row.enhancementStatus === 'success'"
                class="enhancement-result"
              >
                <div class="enhancement-comparison">
                  <el-tag effect="plain" type="info">
                    {{ categoryName(row.modelCategoryId || row.baselineCategoryId || row.categoryId) }}
                  </el-tag>
                  <span>→</span>
                  <el-tag
                    :type="row.baselineCategoryId === row.enhancedCategoryId ? 'success' : 'warning'"
                    effect="plain"
                  >
                    {{ categoryName(row.enhancedCategoryId) }}
                    · {{ Math.round((row.enhancedConfidence || 0) * 100) }}%
                  </el-tag>
                </div>
                <el-tooltip
                  :content="row.enhancedReason"
                  placement="top"
                >
                  <p class="enhancement-reason">{{ row.enhancedReason }}</p>
                </el-tooltip>
                <div class="enhancement-review-actions">
                  <el-button
                    size="small"
                    type="success"
                    :plain="row.enhancementEvaluation !== 'correct'"
                    :disabled="task.committedAt !== undefined"
                    @click="reviewEnhancement(row, 'correct')"
                  >
                    {{ t('tag.enhancementAdopt') }}
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    :plain="row.enhancementEvaluation !== 'incorrect'"
                    :disabled="task.committedAt !== undefined"
                    @click="reviewEnhancement(row, 'incorrect')"
                  >
                    {{ t('tag.enhancementReject') }}
                  </el-button>
                </div>
              </div>
              <el-tag
                v-else-if="row.enhancementStatus === 'failed'"
                type="danger"
                effect="plain"
              >
                {{ t('tag.enhancementItemFailed') }}：{{ row.enhancementError }}
              </el-tag>
              <span
                v-else-if="isEnhancementCandidate(row)"
                class="enhancement-waiting"
              >
                {{ t('tag.enhancementWaiting') }}
              </span>
              <span v-else>—</span>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="currentPage"
          :page-size="PAGE_SIZE"
          :total="reviewSuccessCount"
          layout="prev, pager, next, jumper, total"
          class="review-pagination"
          @current-change="loadPage"
        />
        </template>
        <el-empty v-else :description="t('tag.taskNoDrafts')" />
      </template>
    </div>

    <template #footer>
      <el-button @click="closeDialog">
        {{ t('common.close') }}
      </el-button>
      <el-button
        v-if="task && reviewSuccessCount > 0 && !task.committedAt"
        type="primary"
        :loading="commitBusy || taskStore.enhancing"
        :disabled="task.acceptedCount === 0 || task.status === 'running'"
        @click="handleConfirm"
      >
        {{ task.segmentSize && task.status !== 'paused'
          ? t('tag.reviewCommitSegment', { count: task.acceptedCount })
          : task.status === 'paused'
          ? t('tag.reviewCommitPaused', { count: task.acceptedCount })
          : t('tag.reviewCommit', { count: task.acceptedCount }) }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessageBox } from 'element-plus'
import { useClassificationTaskStore } from '@/stores/classificationTask'
import {
  CLASSIFICATION_ENHANCEMENT_CONFIDENCE_THRESHOLD,
  isClassificationEnhancementCandidate
} from '@/services/classificationEnhancementPolicy'
import type {
  ClassificationAssignment,
  ClassificationCategory,
  ClassificationEnhancementSummary,
  ClassificationEvaluation,
  ClassificationEvaluationSummary,
  ClassificationTask,
  ClassificationTaskItem,
  Repository
} from '@/types'

const CONFIDENCE_THRESHOLD = CLASSIFICATION_ENHANCEMENT_CONFIDENCE_THRESHOLD
const PAGE_SIZE = 50

const props = defineProps<{
  modelValue: boolean
  task: ClassificationTask | null
  categories: ClassificationCategory[]
  repositories: Repository[]
  actionBusy: boolean
  enhancementBusy: boolean
  commitBusy: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  pause: []
  resume: []
  retry: []
  'cancel-task': []
  discard: []
  enhance: []
  'pause-enhancement': []
  confirm: [assignments: ClassificationAssignment[]]
}>()

const { t } = useI18n()
const taskStore = useClassificationTaskStore()
const currentPage = ref(1)
const pageItems = ref<ClassificationTaskItem[]>([])
const pageLoading = ref(false)
const confidenceThresholdPercent = Math.round(CONFIDENCE_THRESHOLD * 100)
const emptyEvaluationSummary = (): ClassificationEvaluationSummary => ({
  evaluatedCount: 0,
  correctCount: 0,
  incorrectCount: 0,
  unreviewedCount: 0,
  lowConfidenceCount: 0,
  accuracy: null,
  corrections: []
})
const evaluationSummary = ref<ClassificationEvaluationSummary>(
  emptyEvaluationSummary()
)
const emptyEnhancementSummary = (): ClassificationEnhancementSummary => ({
  candidateCount: 0,
  pendingCount: 0,
  successCount: 0,
  failedCount: 0,
  reviewedCount: 0,
  correctedCount: 0,
  regressionCount: 0,
  changedCount: 0
})
const enhancementSummary = ref<ClassificationEnhancementSummary>(
  emptyEnhancementSummary()
)

const repositoryNames = computed(() => new Map(
  props.repositories.map(repository => [repository.id, repository.full_name])
))
const progressPercent = computed(() => {
  if (!props.task || props.task.totalCount === 0) return 0
  return Math.round(props.task.processedCount / props.task.totalCount * 100)
})
const currentSegmentNumber = computed(() =>
  (props.task?.currentSegmentIndex || 0) + 1
)
const currentSegmentTarget = computed(() => {
  if (!props.task?.segmentSize) return props.task?.totalCount || 0
  return Math.min(
    props.task.segmentSize,
    props.task.totalCount -
      (props.task.currentSegmentIndex || 0) * props.task.segmentSize
  )
})
const reviewSuccessCount = computed(() =>
  props.task?.segmentSize
    ? props.task.segmentSuccessCount || 0
    : props.task?.successCount || 0
)
const reviewFailedCount = computed(() =>
  props.task?.segmentSize
    ? props.task.segmentFailedCount || 0
    : props.task?.failedCount || 0
)
const enhancementProgressPercent = computed(() => {
  if (!props.task?.enhancementTargetCount) return 0
  return Math.round(
    (props.task.enhancementProcessedCount || 0) /
      props.task.enhancementTargetCount * 100
  )
})
const statusTagType = computed(() => {
  if (!props.task) return 'info'
  if (
    props.task.status === 'completed' ||
    props.task.status === 'segment_ready' ||
    props.task.status === 'committed'
  ) return 'success'
  if (props.task.status === 'partial' || props.task.status === 'paused') {
    return 'warning'
  }
  if (props.task.status === 'cancelled') return 'danger'
  return 'primary'
})
const selectedOnPage = computed(
  () => pageItems.value.filter(item => item.accepted === 1).length
)
const allPageSelected = computed(
  () => pageItems.value.length > 0 && selectedOnPage.value === pageItems.value.length
)
const pageIndeterminate = computed(
  () => selectedOnPage.value > 0 && selectedOnPage.value < pageItems.value.length
)
const reviewedAccuracy = computed(() =>
  evaluationSummary.value.accuracy === null
    ? '—'
    : `${Math.round(evaluationSummary.value.accuracy * 100)}%`
)
const categoryNames = computed(() => new Map(
  props.categories.map(category => [category.categoryId, category.name])
))

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1_000))
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function repositoryName(repositoryId: number) {
  return repositoryNames.value.get(repositoryId) || `#${repositoryId}`
}

function categoryName(categoryId: string) {
  return categoryNames.value.get(categoryId) || categoryId
}

function confidenceTagType(confidence: number) {
  if (confidence < CONFIDENCE_THRESHOLD) return 'danger'
  if (confidence < 0.8) return 'warning'
  return 'success'
}

async function loadPage() {
  if (!props.task || !props.modelValue) return
  pageLoading.value = true
  try {
    pageItems.value = await taskStore.reviewPage(currentPage.value, PAGE_SIZE)
  } finally {
    pageLoading.value = false
  }
}

async function loadEvaluationSummary() {
  const summary = await taskStore.evaluationSummary()
  evaluationSummary.value = summary || emptyEvaluationSummary()
}

async function loadEnhancementSummary() {
  const summary = await taskStore.enhancementSummary()
  enhancementSummary.value = summary || emptyEnhancementSummary()
}

watch(
  () => [
    props.modelValue,
    props.task?.id,
    props.task?.currentSegmentIndex,
    props.task?.successCount,
    props.task?.enhancementProcessedCount,
    props.task?.enhancementStatus
  ] as const,
  ([visible, taskId, segmentIndex], previous) => {
    if (!visible || !taskId) return
    if (taskId !== previous?.[1] || segmentIndex !== previous?.[2]) {
      currentPage.value = 1
    }
    void Promise.all([
      loadPage(),
      loadEvaluationSummary(),
      loadEnhancementSummary()
    ])
  },
  { immediate: true }
)

async function setAccepted(
  repositoryId: number,
  value: boolean | string | number
) {
  const accepted = Boolean(value)
  await taskStore.updateReviewItem(repositoryId, { accepted })
  const item = pageItems.value.find(candidate => candidate.repositoryId === repositoryId)
  if (item) item.accepted = accepted ? 1 : 0
}

async function setCategory(item: ClassificationTaskItem, categoryId: string) {
  if (item.categoryId === categoryId) return
  await taskStore.updateReviewItem(item.repositoryId, {
    categoryId,
    evaluation: 'incorrect',
    accepted: true
  })
  item.categoryId = categoryId
  item.evaluation = 'incorrect'
  item.accepted = 1
  if (
    item.enhancementStatus === 'success' &&
    categoryId !== item.enhancedCategoryId
  ) {
    item.enhancementEvaluation = 'incorrect'
    item.enhancementAdopted = 0
  }
  await Promise.all([loadEvaluationSummary(), loadEnhancementSummary()])
}

async function setEvaluation(
  item: ClassificationTaskItem,
  value: ClassificationEvaluation | ''
) {
  const evaluation = value || null
  await taskStore.updateReviewItem(item.repositoryId, {
    evaluation,
    ...(evaluation === 'correct'
      ? { accepted: true }
      : evaluation === 'incorrect'
        ? { accepted: false }
        : {})
  })
  item.evaluation = evaluation || undefined
  if (evaluation === 'correct') item.accepted = 1
  if (evaluation === 'incorrect') {
    item.accepted = 0
    if (item.enhancementStatus === 'success') {
      item.enhancementEvaluation = 'incorrect'
      item.enhancementAdopted = 0
    }
  }
  await Promise.all([loadEvaluationSummary(), loadEnhancementSummary()])
}

function isEnhancementCandidate(item: ClassificationTaskItem) {
  return isClassificationEnhancementCandidate(item)
}

async function reviewEnhancement(
  item: ClassificationTaskItem,
  evaluation: ClassificationEvaluation
) {
  await taskStore.reviewEnhancedItem(item.repositoryId, evaluation)
  item.enhancementEvaluation = evaluation
  item.enhancementAdopted = evaluation === 'correct' ? 1 : 0
  if (evaluation === 'correct') {
    item.categoryId = item.enhancedCategoryId
    item.confidence = item.enhancedConfidence
    item.reason = item.enhancedReason
    item.evaluation = 'correct'
    item.accepted = 1
  } else {
    item.categoryId = item.baselineCategoryId || item.categoryId
    item.confidence = item.baselineConfidence ?? item.confidence
    item.reason = item.baselineReason || item.reason
    item.evaluation = item.baselineEvaluation
    item.accepted = item.baselineAccepted ?? item.accepted
  }
  await Promise.all([loadEvaluationSummary(), loadEnhancementSummary()])
}

async function togglePage(value: boolean | string | number) {
  const accepted = Boolean(value)
  await taskStore.setReviewItemsAccepted(
    pageItems.value.map(item => item.repositoryId),
    accepted
  )
  pageItems.value.forEach(item => {
    item.accepted = accepted ? 1 : 0
  })
}

function closeDialog() {
  emit('update:modelValue', false)
}

async function handleConfirm() {
  if (!props.task) return
  if (props.task.status === 'paused') {
    try {
      await ElMessageBox.confirm(
        t('tag.commitPausedMessage', {
          count: props.task.acceptedCount,
          remaining: Math.max(
            0,
            props.task.totalCount - props.task.processedCount
          )
        }),
        t('tag.commitPausedTitle'),
        {
          confirmButtonText: t('tag.commitPausedConfirm'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        }
      )
    } catch {
      return
    }
  }
  const assignments = await taskStore.acceptedAssignments()
  emit('confirm', assignments)
}
</script>

<style lang="scss" scoped>
.dialog-scroll-content {
  max-height: calc(94vh - 150px);
  overflow-y: auto;
  padding-right: 4px;
}

.task-summary {
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
}

.task-heading,
.task-metrics,
.task-actions,
.review-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 18px;
}

.evaluation-panel {
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);

  h4 {
    margin: 0 0 12px;
    color: var(--text-primary);
    font-size: 0.92rem;
  }
}

.enhancement-panel {
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
}

.enhancement-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h4,
  p {
    margin: 0;
  }

  h4 {
    color: var(--text-primary);
    font-size: 0.92rem;
  }

  p {
    margin-top: 6px;
    color: var(--text-secondary);
    font-size: 0.78rem;
  }
}

.enhancement-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 12px 0;
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.enhancement-alert {
  margin-top: 10px;
}

.enhancement-result {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.enhancement-comparison,
.enhancement-review-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.enhancement-reason {
  overflow: hidden;
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.76rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.enhancement-waiting {
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.evaluation-metrics {
  display: grid;
  grid-template-columns: repeat(6, minmax(90px, 1fr));
  gap: 8px;
}

.evaluation-metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 6px;
  background: var(--bg-primary);
  text-align: center;

  strong {
    color: var(--text-primary);
    font-size: 1.05rem;
  }

  span {
    color: var(--text-secondary);
    font-size: 0.74rem;
  }

  &.correct strong {
    color: var(--success-color, #67c23a);
  }

  &.incorrect strong {
    color: var(--danger-color, #f56c6c);
  }

  &.accuracy strong {
    color: var(--primary-color, #409eff);
  }
}

.correction-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.evaluation-empty {
  margin: 10px 0 0;
  color: var(--text-secondary);
  font-size: 0.78rem;
}

@media (max-width: 900px) {
  .evaluation-metrics {
    grid-template-columns: repeat(3, 1fr);
  }
}

.task-heading {
  margin-bottom: 12px;
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.task-metrics {
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.task-alert,
.review-notice,
.task-actions {
  margin-bottom: 12px;
}

.review-toolbar {
  justify-content: space-between;
  margin-bottom: 10px;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.review-table {
  width: 100%;

  :deep(.el-select) {
    width: 100%;
  }
}

.review-pagination {
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
