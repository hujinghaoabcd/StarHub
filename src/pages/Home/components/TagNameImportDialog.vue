<template>
  <el-dialog
    :model-value="modelValue"
    title="导入分类名称"
    width="560px"
    destroy-on-close
    @close="closeDialog"
  >
    <el-alert
      title="只创建分类名称，不会给任何仓库分配分类，也不会覆盖现有分类。"
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
    </div>

    <el-input
      v-model="sourceText"
      type="textarea"
      :rows="12"
      resize="vertical"
      placeholder="每行一个分类名称，也支持逗号分隔。JSON 可使用字符串数组、包含 name 的对象数组，或 StarHub 备份文件。"
    />

    <div class="import-summary">
      <span>可导入 {{ parsed.names.length }} 个</span>
      <span v-if="parsed.duplicates">忽略重复 {{ parsed.duplicates }} 个</span>
      <span v-if="parsed.invalid">忽略无效 {{ parsed.invalid }} 个</span>
    </div>

    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button
        type="primary"
        :loading="importing"
        :disabled="parsed.names.length === 0"
        @click="importNames"
      >
        导入 {{ parsed.names.length }} 个分类
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useTagStore } from '@/stores/tag'
import { parseTagNameImport } from '@/services/tagNameImport'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const tagStore = useTagStore()
const sourceText = ref('')
const fileName = ref('')
const importing = ref(false)
const parsed = computed(() => parseTagNameImport(sourceText.value))

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
      console.error('Failed to read category names:', error)
      ElMessage.error('无法读取分类文件。')
    }
  }

  input.click()
}

async function importNames() {
  if (parsed.value.names.length === 0) return

  try {
    await ElMessageBox.confirm(
      `将创建 ${parsed.value.names.length} 个分类名称。现有同名分类会自动跳过，任何仓库都不会被分配或移除分类。`,
      '确认导入分类名称',
      {
        confirmButtonText: '确认导入',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
  } catch {
    return
  }

  importing.value = true

  try {
    const result = await tagStore.importTagNames(parsed.value.names)
    const skipped = result.skipped + parsed.value.duplicates

    if (result.created > 0) {
      ElMessage.success(
        `已创建 ${result.created} 个分类${skipped ? `，跳过 ${skipped} 个重复名称` : ''}`
      )
    } else {
      ElMessage.info('没有新增分类，导入名称均已存在。')
    }

    closeDialog()
  } catch (error) {
    console.error('Failed to import category names:', error)
    ElMessage.error('分类名称导入失败，原有分类未被修改。')
  } finally {
    importing.value = false
  }
}
</script>

<style lang="scss" scoped>
.import-alert {
  margin-bottom: 16px;
}

.import-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.file-name {
  min-width: 0;
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: 0.8rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.import-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
  color: var(--text-tertiary);
  font-size: 0.8rem;
}
</style>
