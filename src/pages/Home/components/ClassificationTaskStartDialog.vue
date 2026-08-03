<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('tag.taskStartTitle')"
    width="min(620px, 94vw)"
    :close-on-click-modal="false"
    @close="closeDialog"
  >
    <el-alert
      :title="t('tag.pilotNotice')"
      type="info"
      :closable="false"
      show-icon
      class="pilot-alert"
    />

    <el-form label-position="top">
      <el-form-item :label="t('tag.pilotScope')">
        <el-radio-group v-model="sampleSize">
          <el-radio-button :value="100">100</el-radio-button>
          <el-radio-button :value="200">200</el-radio-button>
          <el-radio-button :value="500">500</el-radio-button>
          <el-radio-button value="all">{{ t('tag.pilotAll') }}</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item
        v-if="sampleSize !== 'all'"
        :label="t('tag.pilotSelection')"
      >
        <el-switch
          v-model="randomSample"
          :active-text="t('tag.pilotRandom')"
          :inactive-text="t('tag.pilotOrdered')"
        />
        <div class="form-tip">{{ t('tag.pilotRandomTip') }}</div>
      </el-form-item>
    </el-form>

    <el-alert
      v-if="sampleSize === 'all'"
      :title="t('tag.pilotAllWarning', { count: repositories.length })"
      type="warning"
      :closable="false"
      show-icon
      class="pilot-alert"
    />

    <el-descriptions :column="2" border size="small">
      <el-descriptions-item :label="t('tag.pilotAvailable')">
        {{ formatNumber(repositories.length) }}
      </el-descriptions-item>
      <el-descriptions-item :label="t('tag.pilotSelected')">
        {{ formatNumber(sample.repositories.length) }}
      </el-descriptions-item>
      <el-descriptions-item :label="t('tag.taskBatches')">
        {{ estimate.batchCount }}
      </el-descriptions-item>
      <el-descriptions-item :label="t('tag.taskTokenEstimate')">
        {{ formatNumber(estimate.estimatedInputTokens + estimate.estimatedOutputTokens) }}
      </el-descriptions-item>
    </el-descriptions>

    <template #footer>
      <el-button @click="closeDialog">{{ t('common.cancel') }}</el-button>
      <el-button
        type="primary"
        :disabled="sample.repositories.length === 0"
        @click="startTask"
      >
        {{ t('tag.startTask') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  selectClassificationSample,
  type ClassificationSampleSize
} from '@/services/classificationSampling'
import { estimateClassificationUsage } from '@/services/classificationProtocol'
import type {
  ClassificationCategory,
  ClassificationTaskSelectionMode,
  Repository
} from '@/types'

const props = defineProps<{
  modelValue: boolean
  repositories: Repository[]
  categories: ClassificationCategory[]
  batchSize: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  start: [payload: {
    repositories: Repository[]
    selectionMode: ClassificationTaskSelectionMode
    sampleSeed?: number
  }]
}>()

const { t } = useI18n()
const sampleSize = ref<ClassificationSampleSize>(200)
const randomSample = ref(true)
const sampleSeed = ref(1)

watch(
  () => props.modelValue,
  visible => {
    if (!visible) return
    sampleSize.value = 200
    randomSample.value = true
    sampleSeed.value = Math.trunc(Date.now() % 2_147_483_647)
  }
)

const sample = computed(() => selectClassificationSample(
  props.repositories,
  {
    size: sampleSize.value,
    random: randomSample.value,
    seed: sampleSeed.value
  }
))

const estimate = computed(() => estimateClassificationUsage(
  sample.value.repositories,
  props.categories,
  props.batchSize
))

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

function closeDialog() {
  emit('update:modelValue', false)
}

function startTask() {
  emit('start', sample.value)
}
</script>

<style lang="scss" scoped>
.pilot-alert {
  margin-bottom: 16px;
}

.form-tip {
  width: 100%;
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 0.78rem;
  line-height: 1.5;
}
</style>
