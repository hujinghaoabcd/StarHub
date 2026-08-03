<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('tag.taskTitle')"
    width="min(1040px, 96vw)"
    :close-on-click-modal="false"
    destroy-on-close
    @close="closeDialog"
  >
    <template v-if="task">
      <div class="task-summary">
        <div class="task-heading">
          <el-tag :type="statusTagType" effect="plain">
            {{ t(`tag.taskStatus.${task.status}`) }}
          </el-tag>
          <span>{{ task.provider }} / {{ task.model }}</span>
          <span>{{ t('tag.metadataOnly') }}</span>
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
          v-if="task.status === 'paused' && task.failedCount === 0 && !task.committedAt"
          type="primary"
          :loading="actionBusy"
          @click="emit('resume')"
        >
          {{ t('tag.resumeTask') }}
        </el-button>
        <el-button
          v-if="(task.status === 'partial' || task.status === 'paused') && task.failedCount > 0 && !task.committedAt"
          type="warning"
          :loading="actionBusy"
          @click="emit('retry')"
        >
          {{ t('tag.retryFailed', { count: task.failedCount }) }}
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

      <template v-if="task.successCount > 0">
        <el-alert
          :title="t('tag.reviewNotice', { threshold: confidenceThresholdPercent })"
          type="warning"
          :closable="false"
          show-icon
          class="review-notice"
        />

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
              total: task.successCount
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
                @update:model-value="setCategory(row.repositoryId, $event)"
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
        </el-table>

        <el-pagination
          v-model:current-page="currentPage"
          :page-size="PAGE_SIZE"
          :total="task.successCount"
          layout="prev, pager, next, jumper, total"
          class="review-pagination"
          @current-change="loadPage"
        />
      </template>
      <el-empty v-else :description="t('tag.taskNoDrafts')" />
    </template>

    <template #footer>
      <el-button @click="closeDialog">
        {{ t('common.close') }}
      </el-button>
      <el-button
        v-if="task && task.successCount > 0 && !task.committedAt"
        type="primary"
        :loading="commitBusy"
        :disabled="task.acceptedCount === 0 || task.status === 'running'"
        @click="handleConfirm"
      >
        {{ task.status === 'paused'
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
import type {
  ClassificationAssignment,
  ClassificationCategory,
  ClassificationTask,
  ClassificationTaskItem,
  Repository
} from '@/types'

const CONFIDENCE_THRESHOLD = 0.65
const PAGE_SIZE = 50

const props = defineProps<{
  modelValue: boolean
  task: ClassificationTask | null
  categories: ClassificationCategory[]
  repositories: Repository[]
  actionBusy: boolean
  commitBusy: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  pause: []
  resume: []
  retry: []
  'cancel-task': []
  discard: []
  confirm: [assignments: ClassificationAssignment[]]
}>()

const { t } = useI18n()
const taskStore = useClassificationTaskStore()
const currentPage = ref(1)
const pageItems = ref<ClassificationTaskItem[]>([])
const pageLoading = ref(false)
const confidenceThresholdPercent = Math.round(CONFIDENCE_THRESHOLD * 100)

const repositoryNames = computed(() => new Map(
  props.repositories.map(repository => [repository.id, repository.full_name])
))
const progressPercent = computed(() => {
  if (!props.task || props.task.totalCount === 0) return 0
  return Math.round(props.task.processedCount / props.task.totalCount * 100)
})
const statusTagType = computed(() => {
  if (!props.task) return 'info'
  if (
    props.task.status === 'completed' ||
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

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

function repositoryName(repositoryId: number) {
  return repositoryNames.value.get(repositoryId) || `#${repositoryId}`
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

watch(
  () => [
    props.modelValue,
    props.task?.id,
    props.task?.successCount
  ] as const,
  ([visible, taskId], previous) => {
    if (!visible || !taskId) return
    if (taskId !== previous?.[1]) currentPage.value = 1
    void loadPage()
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

async function setCategory(repositoryId: number, categoryId: string) {
  await taskStore.updateReviewItem(repositoryId, { categoryId })
  const item = pageItems.value.find(candidate => candidate.repositoryId === repositoryId)
  if (item) item.categoryId = categoryId
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
            props.task.totalCount - props.task.acceptedCount
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
