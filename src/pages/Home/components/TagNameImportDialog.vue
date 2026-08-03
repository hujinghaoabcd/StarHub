<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('categoryGovernance.importTitle')"
    width="min(920px, 94vw)"
    destroy-on-close
    @close="closeDialog"
  >
    <el-alert
      :title="t('categoryGovernance.importNotice')"
      type="info"
      :closable="false"
      show-icon
      class="import-alert"
    />

    <div class="import-toolbar">
      <el-button @click="chooseFile">
        <el-icon><Upload /></el-icon>
        {{ t('categoryGovernance.chooseFile') }}
      </el-button>
      <span v-if="fileName" class="file-name">{{ fileName }}</span>
      <span class="source-version">{{ t('categoryGovernance.registryVersion', { version: parsed.sourceVersion }) }}</span>
    </div>

    <el-input
      v-model="sourceText"
      type="textarea"
      :rows="8"
      resize="vertical"
      :placeholder="t('categoryGovernance.importPlaceholder')"
    />

    <div class="import-summary">
      <el-tag type="success">{{ t('categoryGovernance.statusCreate') }} {{ preview.counts.create }}</el-tag>
      <el-tag type="warning">{{ t('categoryGovernance.statusRename') }} {{ preview.counts.rename }}</el-tag>
      <el-tag>{{ t('categoryGovernance.statusMerge') }} {{ preview.counts.merge }}</el-tag>
      <el-tag type="info">{{ t('categoryGovernance.statusUpdate') }} {{ preview.counts.update }}</el-tag>
      <el-tag type="info">{{ t('categoryGovernance.statusUnchanged') }} {{ preview.counts.unchanged }}</el-tag>
      <el-tag :type="preview.counts.conflict ? 'danger' : 'info'">
        {{ t('categoryGovernance.statusConflict') }} {{ preview.counts.conflict }}
      </el-tag>
      <span v-if="parsed.duplicates">{{ t('categoryGovernance.ignoredDuplicates', { count: parsed.duplicates }) }}</span>
      <span v-if="parsed.invalid">{{ t('categoryGovernance.ignoredInvalid', { count: parsed.invalid }) }}</span>
    </div>

    <el-table
      v-if="preview.operations.length"
      :data="preview.operations"
      max-height="320"
      class="preview-table"
    >
      <el-table-column :label="t('categoryGovernance.importedCategory')" min-width="190">
        <template #default="scope">
          <div class="category-name">{{ scope.row.definition.nameZh }}</div>
          <div v-if="scope.row.definition.nameEn !== scope.row.definition.nameZh" class="category-subtitle">
            {{ scope.row.definition.nameEn }}
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="t('categoryGovernance.currentCategory')" min-width="180">
        <template #default="scope">
          {{ scope.row.currentNames.join('、') || '—' }}
        </template>
      </el-table-column>
      <el-table-column :label="t('categoryGovernance.operation')" width="90">
        <template #default="scope">
          <el-tag :type="statusType(scope.row.status)" size="small">
            {{ statusLabel(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('categoryGovernance.explanation')" min-width="230">
        <template #default="scope">{{ operationMessage(scope.row) }}</template>
      </el-table-column>
    </el-table>

    <el-empty
      v-else
      :image-size="72"
      :description="t('categoryGovernance.emptyPreview')"
    />

    <template #footer>
      <el-button @click="closeDialog">{{ t('common.cancel') }}</el-button>
      <el-button
        type="primary"
        :loading="importing"
        :disabled="parsed.definitions.length === 0 || preview.hasConflicts"
        @click="applyMigration"
      >
        {{ t('categoryGovernance.applyCount', { count: parsed.definitions.length }) }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useTagStore } from '@/stores/tag'
import {
  parseCategoryRegistryImport
} from '@/services/categoryRegistryImport'
import {
  applyCategoryRegistryMigration,
  buildCategoryMigrationPreview,
  type CategoryMigrationStatus
} from '@/services/categoryGovernance'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const tagStore = useTagStore()
const { t } = useI18n()
const sourceText = ref('')
const fileName = ref('')
const importing = ref(false)
const parsed = computed(() => parseCategoryRegistryImport(sourceText.value))
const preview = computed(() => buildCategoryMigrationPreview(
  tagStore.tags,
  parsed.value.definitions,
  parsed.value.sourceVersion
))

const STATUS_KEYS: Record<CategoryMigrationStatus, string> = {
  create: 'categoryGovernance.statusCreate',
  rename: 'categoryGovernance.statusRename',
  merge: 'categoryGovernance.statusMerge',
  update: 'categoryGovernance.statusUpdate',
  unchanged: 'categoryGovernance.statusUnchanged',
  conflict: 'categoryGovernance.statusConflict'
}

function statusLabel(status: CategoryMigrationStatus) {
  return t(STATUS_KEYS[status])
}

function operationMessage(operation: { status: CategoryMigrationStatus; sourceTagIds: string[] }) {
  if (operation.status === 'merge') {
    return t('categoryGovernance.operationMerge', { count: operation.sourceTagIds.length + 1 })
  }
  return t(`categoryGovernance.operation${operation.status.charAt(0).toUpperCase()}${operation.status.slice(1)}`)
}

function statusType(status: CategoryMigrationStatus) {
  if (status === 'create') return 'success'
  if (status === 'rename') return 'warning'
  if (status === 'conflict') return 'danger'
  return 'info'
}

function reset() {
  sourceText.value = ''
  fileName.value = ''
  importing.value = false
}

function closeDialog() {
  emit('update:modelValue', false)
  reset()
}

function chooseFile() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.txt,.csv,.json,text/plain,text/csv,application/json'

  input.onchange = async event => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
      sourceText.value = await file.text()
      fileName.value = file.name
    } catch (error) {
      console.error('Failed to read category registry:', error)
      ElMessage.error(t('categoryGovernance.readFileFailed'))
    }
  }

  input.click()
}

async function applyMigration() {
  if (!parsed.value.definitions.length || preview.value.hasConflicts) return

  try {
    await ElMessageBox.confirm(
      t('categoryGovernance.confirmApplyMessage', preview.value.counts),
      t('categoryGovernance.confirmApplyTitle'),
      {
        confirmButtonText: t('categoryGovernance.confirmApply'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  importing.value = true
  try {
    const result = await applyCategoryRegistryMigration(
      parsed.value.definitions,
      parsed.value.sourceVersion
    )
    await tagStore.loadTags()
    ElMessage.success(
      t('categoryGovernance.migrationSuccess', {
        create: result.created,
        rename: result.renamed,
        merge: result.merged,
        update: result.updated
      })
    )
    closeDialog()
  } catch (error) {
    console.error('Failed to apply category registry:', error)
    ElMessage.error(error instanceof Error ? error.message : t('categoryGovernance.migrationFailed'))
  } finally {
    importing.value = false
  }
}
</script>

<style lang="scss" scoped>
.import-alert {
  margin-bottom: 16px;
}

.import-toolbar,
.import-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.import-toolbar {
  margin-bottom: 12px;
}

.file-name,
.source-version,
.import-summary {
  color: var(--text-tertiary);
  font-size: 0.8rem;
}

.file-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-version {
  margin-left: auto;
}

.import-summary {
  margin-top: 12px;
}

.preview-table {
  margin-top: 12px;
}

.category-name {
  color: var(--text-primary);
  font-weight: 600;
}

.category-subtitle {
  margin-top: 2px;
  color: var(--text-tertiary);
  font-size: 0.75rem;
}
</style>
