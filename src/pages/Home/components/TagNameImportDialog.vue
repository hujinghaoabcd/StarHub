<template>
  <el-dialog
    :model-value="modelValue"
    title="导入正式分类注册表"
    width="min(920px, 94vw)"
    destroy-on-close
    @close="closeDialog"
  >
    <el-alert
      title="导入内容由当前用户决定，StarHub 不预设任何个人分类体系。应用前会自动备份；旧项目关系不会丢失。"
      type="info"
      :closable="false"
      show-icon
      class="import-alert"
    />

    <div class="import-toolbar">
      <el-button @click="chooseFile">
        <el-icon><Upload /></el-icon>
        选择 TXT / CSV / JSON
      </el-button>
      <span v-if="fileName" class="file-name">{{ fileName }}</span>
      <span class="source-version">注册表版本：{{ parsed.sourceVersion }}</span>
    </div>

    <el-input
      v-model="sourceText"
      type="textarea"
      :rows="8"
      resize="vertical"
      placeholder="支持每行一个名称、JSON 数组、含 tags 的 StarHub 备份，或含 categoryId/nameZh/nameEn/aliases/description/examples/exclusions 的通用注册表。"
    />

    <div class="import-summary">
      <el-tag type="success">新增 {{ preview.counts.create }}</el-tag>
      <el-tag type="warning">重命名 {{ preview.counts.rename }}</el-tag>
      <el-tag>合并 {{ preview.counts.merge }}</el-tag>
      <el-tag type="info">更新 {{ preview.counts.update }}</el-tag>
      <el-tag type="info">不变 {{ preview.counts.unchanged }}</el-tag>
      <el-tag :type="preview.counts.conflict ? 'danger' : 'info'">
        冲突 {{ preview.counts.conflict }}
      </el-tag>
      <span v-if="parsed.duplicates">忽略重复 {{ parsed.duplicates }} 个</span>
      <span v-if="parsed.invalid">忽略无效 {{ parsed.invalid }} 个</span>
    </div>

    <el-table
      v-if="preview.operations.length"
      :data="preview.operations"
      max-height="320"
      class="preview-table"
    >
      <el-table-column label="导入分类" min-width="190">
        <template #default="scope">
          <div class="category-name">{{ scope.row.definition.nameZh }}</div>
          <div v-if="scope.row.definition.nameEn !== scope.row.definition.nameZh" class="category-subtitle">
            {{ scope.row.definition.nameEn }}
          </div>
        </template>
      </el-table-column>
      <el-table-column label="当前分类" min-width="180">
        <template #default="scope">
          {{ scope.row.currentNames.join('、') || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90">
        <template #default="scope">
          <el-tag :type="statusType(scope.row.status)" size="small">
            {{ statusLabel(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="说明" min-width="230" />
    </el-table>

    <el-empty
      v-else
      :image-size="72"
      description="粘贴或选择分类文件后显示迁移预览"
    />

    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button
        type="primary"
        :loading="importing"
        :disabled="parsed.definitions.length === 0 || preview.hasConflicts"
        @click="applyMigration"
      >
        应用 {{ parsed.definitions.length }} 个分类
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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
const sourceText = ref('')
const fileName = ref('')
const importing = ref(false)
const parsed = computed(() => parseCategoryRegistryImport(sourceText.value))
const preview = computed(() => buildCategoryMigrationPreview(
  tagStore.tags,
  parsed.value.definitions,
  parsed.value.sourceVersion
))

const STATUS_LABELS: Record<CategoryMigrationStatus, string> = {
  create: '新增',
  rename: '重命名',
  merge: '合并',
  update: '更新',
  unchanged: '不变',
  conflict: '冲突'
}

function statusLabel(status: CategoryMigrationStatus) {
  return STATUS_LABELS[status]
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
      ElMessage.error('无法读取分类文件。')
    }
  }

  input.click()
}

async function applyMigration() {
  if (!parsed.value.definitions.length || preview.value.hasConflicts) return

  try {
    await ElMessageBox.confirm(
      `将按预览执行：新增 ${preview.value.counts.create}、重命名 ${preview.value.counts.rename}、合并 ${preview.value.counts.merge}、更新 ${preview.value.counts.update}。执行前会自动保存完整分类和项目关系快照。`,
      '确认应用分类注册表',
      {
        confirmButtonText: '备份并应用',
        cancelButtonText: '取消',
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
      `注册表迁移完成：新增 ${result.created}、重命名 ${result.renamed}、合并 ${result.merged}、更新 ${result.updated}`
    )
    closeDialog()
  } catch (error) {
    console.error('Failed to apply category registry:', error)
    ElMessage.error(error instanceof Error ? error.message : '分类迁移失败，原数据未修改。')
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
