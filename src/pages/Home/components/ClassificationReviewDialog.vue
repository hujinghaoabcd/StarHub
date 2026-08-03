<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('tag.reviewTitle')"
    width="min(960px, 94vw)"
    :close-on-click-modal="false"
    destroy-on-close
    @close="handleCancel"
  >
    <el-alert
      :title="t('tag.reviewNotice', { threshold: confidenceThresholdPercent })"
      type="warning"
      :closable="false"
      show-icon
      class="review-notice"
    />

    <div class="review-toolbar">
      <el-checkbox
        :model-value="allSelected"
        :indeterminate="isIndeterminate"
        @change="toggleAll"
      >
        {{ t('tag.reviewSelectAll') }}
      </el-checkbox>
      <span>
        {{ t('tag.reviewSelectedCount', {
          selected: selectedCount,
          total: items.length
        }) }}
      </span>
    </div>

    <el-table
      :data="items"
      row-key="repositoryId"
      max-height="56vh"
      border
      class="review-table"
    >
      <el-table-column width="52" align="center">
        <template #default="{ row }">
          <el-checkbox
            :model-value="selectedRepositoryIds.has(row.repositoryId)"
            :aria-label="row.repositoryName"
            @change="toggleRepository(row.repositoryId, $event)"
          />
        </template>
      </el-table-column>

      <el-table-column
        prop="repositoryName"
        :label="t('tag.reviewRepository')"
        min-width="210"
        show-overflow-tooltip
      />

      <el-table-column :label="t('tag.reviewCategory')" min-width="190">
        <template #default="{ row }">
          <el-select
            :model-value="selectedCategoryIds.get(row.repositoryId)"
            size="small"
            filterable
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
          <el-tag :type="confidenceTagType(row.confidence)" effect="plain">
            {{ Math.round(row.confidence * 100) }}%
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column
        prop="reason"
        :label="t('tag.reviewReason')"
        min-width="250"
        show-overflow-tooltip
      />
    </el-table>

    <template #footer>
      <el-button @click="handleCancel">
        {{ t('common.cancel') }}
      </el-button>
      <el-button
        type="primary"
        :disabled="selectedCount === 0"
        @click="handleConfirm"
      >
        {{ t('tag.reviewCommit', { count: selectedCount }) }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  ClassificationAssignment,
  ClassificationCategory,
  ClassificationReviewItem
} from '@/types'

const CONFIDENCE_THRESHOLD = 0.65

const props = defineProps<{
  modelValue: boolean
  items: ClassificationReviewItem[]
  categories: ClassificationCategory[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [assignments: ClassificationAssignment[]]
}>()

const { t } = useI18n()
const selectedRepositoryIds = ref<Set<number>>(new Set())
const selectedCategoryIds = ref<Map<number, string>>(new Map())
const confidenceThresholdPercent = Math.round(CONFIDENCE_THRESHOLD * 100)

const selectedCount = computed(() => selectedRepositoryIds.value.size)
const allSelected = computed(
  () => props.items.length > 0 && selectedCount.value === props.items.length
)
const isIndeterminate = computed(
  () => selectedCount.value > 0 && selectedCount.value < props.items.length
)

function resetDraft() {
  selectedRepositoryIds.value = new Set(
    props.items
      .filter(item => item.confidence >= CONFIDENCE_THRESHOLD)
      .map(item => item.repositoryId)
  )
  selectedCategoryIds.value = new Map(
    props.items.map(item => [item.repositoryId, item.categoryId])
  )
}

watch(
  () => [props.modelValue, props.items] as const,
  ([visible]) => {
    if (visible) resetDraft()
  },
  { deep: true }
)

function toggleAll(value: boolean | string | number) {
  selectedRepositoryIds.value = value
    ? new Set(props.items.map(item => item.repositoryId))
    : new Set()
}

function toggleRepository(
  repositoryId: number,
  value: boolean | string | number
) {
  const next = new Set(selectedRepositoryIds.value)
  if (value) next.add(repositoryId)
  else next.delete(repositoryId)
  selectedRepositoryIds.value = next
}

function setCategory(repositoryId: number, categoryId: string) {
  const next = new Map(selectedCategoryIds.value)
  next.set(repositoryId, categoryId)
  selectedCategoryIds.value = next
}

function confidenceTagType(confidence: number) {
  if (confidence < CONFIDENCE_THRESHOLD) return 'danger'
  if (confidence < 0.8) return 'warning'
  return 'success'
}

function handleCancel() {
  emit('update:modelValue', false)
}

function handleConfirm() {
  const assignments = props.items
    .filter(item => selectedRepositoryIds.value.has(item.repositoryId))
    .map(item => ({
      repositoryId: item.repositoryId,
      categoryId:
        selectedCategoryIds.value.get(item.repositoryId) || item.categoryId,
      confidence: item.confidence,
      reason: item.reason
    }))
  emit('confirm', assignments)
  emit('update:modelValue', false)
}
</script>

<style lang="scss" scoped>
.review-notice {
  margin-bottom: 14px;
}

.review-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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
</style>
