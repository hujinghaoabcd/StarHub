<template>
  <el-dialog
    :model-value="modelValue"
    title="分类管理"
    width="min(1040px, 96vw)"
    destroy-on-close
    @open="loadSnapshot"
    @close="emit('update:modelValue', false)"
  >
    <el-alert
      title="这里管理当前浏览器中的分类。重命名不会改变分类 ID；合并会保留并去重全部项目关系。"
      type="info"
      :closable="false"
      show-icon
      class="manager-alert"
    />

    <div class="manager-toolbar">
      <el-input
        v-model="query"
        clearable
        placeholder="搜索名称、英文名或别名"
        class="search-input"
      />
      <el-select v-model="sortMode" class="sort-select">
        <el-option label="按名称" value="name" />
        <el-option label="项目数从多到少" value="count-desc" />
        <el-option label="项目数从少到多" value="count-asc" />
        <el-option label="最近更新" value="updated" />
      </el-select>
      <el-checkbox v-model="emptyOnly">只看空分类</el-checkbox>
      <el-button
        :disabled="!latestSnapshot || busy"
        @click="undoLatest"
      >
        <el-icon><RefreshLeft /></el-icon>
        撤销上次迁移
      </el-button>
    </div>

    <div v-if="latestSnapshot" class="snapshot-tip">
      可撤销：{{ latestSnapshot.reason }}（{{ formatTime(latestSnapshot.createdAt) }}）
    </div>

    <el-table :data="filteredTags" max-height="520" v-loading="busy">
      <el-table-column label="分类" min-width="260">
        <template #default="scope">
          <div class="category-cell">
            <span class="color-dot" :style="{ backgroundColor: scope.row.color }"></span>
            <span v-if="scope.row.emoji">{{ scope.row.emoji }}</span>
            <div class="category-text">
              <div class="category-primary" :title="scope.row.name">{{ displayName(scope.row) }}</div>
              <div v-if="scope.row.registry?.nameEn" class="category-secondary">
                {{ scope.row.registry.nameEn }}
              </div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="注册表" width="110">
        <template #default="scope">
          <el-tag v-if="scope.row.registry?.managed" type="success" size="small">正式</el-tag>
          <el-tag v-else type="info" size="small">普通</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="项目数" width="90" sortable :sort-method="sortByCount">
        <template #default="scope">{{ scope.row.repos.length }}</template>
      </el-table-column>
      <el-table-column label="上级分类" min-width="150">
        <template #default="scope">{{ scope.row.registry?.level1 || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="scope">
          <el-button text type="primary" @click="openEdit(scope.row)">编辑</el-button>
          <el-button text type="warning" @click="openMerge(scope.row)">合并到…</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="result-count">显示 {{ filteredTags.length }} / {{ tagStore.tags.length }} 个分类</div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="showEdit"
    title="安全编辑分类"
    width="min(620px, 92vw)"
    append-to-body
  >
    <el-alert
      v-if="editingTag && !editingTag.registry"
      title="这是普通分类。本次编辑只修改名称、颜色和 emoji；请通过“导入正式分类注册表”统一补充 AI 元数据。"
      type="info"
      :closable="false"
      class="edit-alert"
    />
    <el-form label-width="100px">
      <el-form-item label="中文名称">
        <el-input v-model="editForm.nameZh" maxlength="120" show-word-limit />
      </el-form-item>
      <el-form-item label="英文名称" v-if="editingTag?.registry">
        <el-input v-model="editForm.nameEn" maxlength="120" />
      </el-form-item>
      <el-form-item label="别名" v-if="editingTag?.registry">
        <el-input v-model="editAliases" placeholder="逗号或分号分隔" />
      </el-form-item>
      <el-form-item label="中文说明" v-if="editingTag?.registry">
        <el-input v-model="editForm.descriptionZh" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item label="英文说明" v-if="editingTag?.registry">
        <el-input v-model="editForm.descriptionEn" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item label="示例" v-if="editingTag?.registry">
        <el-input v-model="editExamples" placeholder="逗号或分号分隔" />
      </el-form-item>
      <el-form-item label="排除项" v-if="editingTag?.registry">
        <el-input v-model="editExclusions" placeholder="逗号或分号分隔" />
      </el-form-item>
      <el-form-item label="上级分类" v-if="editingTag?.registry">
        <el-input v-model="editForm.level1" />
      </el-form-item>
      <el-form-item label="显示名称" v-if="editingTag?.registry">
        <el-input v-model="editForm.level2" placeholder="用于侧栏的简短名称（可选）" />
      </el-form-item>
      <el-form-item label="外观">
        <el-color-picker v-model="editForm.color" />
        <el-input v-model="editForm.emoji" maxlength="2" class="emoji-input" placeholder="emoji" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showEdit = false">取消</el-button>
      <el-button type="primary" :loading="busy" :disabled="!editForm.nameZh.trim()" @click="saveEdit">
        保存（ID 不变）
      </el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="showMerge"
    title="合并分类"
    width="min(520px, 92vw)"
    append-to-body
  >
    <p>把“{{ mergeSource?.name }}”及其全部项目关系合并到：</p>
    <el-select v-model="mergeTargetId" filterable class="merge-select">
      <el-option
        v-for="tag in mergeTargets"
        :key="tag.id"
        :label="`${tag.name}（${tag.repos.length}）`"
        :value="tag.id"
      />
    </el-select>
    <el-alert
      title="执行前会自动备份。重复项目关系会被去重，源分类随后删除。"
      type="warning"
      :closable="false"
      class="merge-alert"
    />
    <template #footer>
      <el-button @click="showMerge = false">取消</el-button>
      <el-button type="primary" :loading="busy" :disabled="!mergeTargetId" @click="saveMerge">
        备份并合并
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RefreshLeft } from '@element-plus/icons-vue'
import { useTagStore } from '@/stores/tag'
import type { CategoryMigrationSnapshot, Tag } from '@/types'
import type { CategoryRegistryDefinition } from '@/services/categoryRegistryImport'
import {
  latestCategoryMigrationSnapshot,
  mergeCategoriesSafely,
  undoLatestCategoryMigration,
  updateCategorySafely
} from '@/services/categoryGovernance'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const tagStore = useTagStore()
const query = ref('')
const sortMode = ref('name')
const emptyOnly = ref(false)
const busy = ref(false)
const latestSnapshot = ref<CategoryMigrationSnapshot>()
const showEdit = ref(false)
const editingTag = ref<Tag>()
const editAliases = ref('')
const editExamples = ref('')
const editExclusions = ref('')
const showMerge = ref(false)
const mergeSource = ref<Tag>()
const mergeTargetId = ref('')

const editForm = reactive<CategoryRegistryDefinition>({
  registryKey: '',
  nameZh: '',
  nameEn: '',
  aliases: [],
  descriptionZh: '',
  descriptionEn: '',
  examples: [],
  exclusions: [],
  level1: '',
  level2: '',
  color: '#409EFF',
  emoji: ''
})

const filteredTags = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  const values = tagStore.tags.filter(tag => {
    if (emptyOnly.value && tag.repos.length > 0) return false
    if (!needle) return true
    return [tag.name, tag.registry?.nameEn, ...(tag.registry?.aliases || [])]
      .filter(Boolean)
      .some(value => String(value).toLocaleLowerCase().includes(needle))
  })

  return [...values].sort((left, right) => {
    if (sortMode.value === 'count-desc') return right.repos.length - left.repos.length
    if (sortMode.value === 'count-asc') return left.repos.length - right.repos.length
    if (sortMode.value === 'updated') return right.updatedAt - left.updatedAt
    return displayName(left).localeCompare(displayName(right), 'zh-CN')
  })
})

const mergeTargets = computed(() => tagStore.tags
  .filter(tag => tag.id !== mergeSource.value?.id)
  .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN')))

function splitList(value: string) {
  return [...new Set(value.split(/[，,;；\n]+/).map(item => item.trim()).filter(Boolean))]
}

function displayName(tag: Tag) {
  return tag.registry?.level2 || tag.name
}

function sortByCount(left: Tag, right: Tag) {
  return left.repos.length - right.repos.length
}

function formatTime(value: number) {
  return new Date(value).toLocaleString()
}

async function loadSnapshot() {
  latestSnapshot.value = await latestCategoryMigrationSnapshot()
}

function openEdit(tag: Tag) {
  editingTag.value = tag
  const registry = tag.registry
  Object.assign(editForm, {
    registryKey: registry?.registryKey || tag.id,
    nameZh: registry?.nameZh || tag.name,
    nameEn: registry?.nameEn || tag.name,
    aliases: registry?.aliases || [],
    descriptionZh: registry?.descriptionZh || '',
    descriptionEn: registry?.descriptionEn || '',
    examples: registry?.examples || [],
    exclusions: registry?.exclusions || [],
    level1: registry?.level1 || '',
    level2: registry?.level2 || '',
    color: tag.color,
    emoji: tag.emoji || ''
  })
  editAliases.value = (registry?.aliases || []).join('，')
  editExamples.value = (registry?.examples || []).join('，')
  editExclusions.value = (registry?.exclusions || []).join('，')
  showEdit.value = true
}

async function saveEdit() {
  if (!editingTag.value || !editForm.nameZh.trim()) return
  busy.value = true
  try {
    await updateCategorySafely(editingTag.value.id, {
      ...editForm,
      nameZh: editForm.nameZh.trim(),
      nameEn: editForm.nameEn.trim() || editForm.nameZh.trim(),
      aliases: splitList(editAliases.value),
      examples: splitList(editExamples.value),
      exclusions: splitList(editExclusions.value)
    })
    await tagStore.loadTags()
    await loadSnapshot()
    showEdit.value = false
    ElMessage.success('分类已安全更新，分类 ID 和项目关系保持不变。')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '分类更新失败。')
  } finally {
    busy.value = false
  }
}

function openMerge(tag: Tag) {
  mergeSource.value = tag
  mergeTargetId.value = ''
  showMerge.value = true
}

async function saveMerge() {
  if (!mergeSource.value || !mergeTargetId.value) return
  const target = tagStore.tags.find(tag => tag.id === mergeTargetId.value)
  if (!target) return
  try {
    await ElMessageBox.confirm(
      `确认把“${mergeSource.value.name}”合并到“${target.name}”？`,
      '确认合并分类',
      { confirmButtonText: '备份并合并', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  busy.value = true
  try {
    await mergeCategoriesSafely(target.id, [mergeSource.value.id])
    await tagStore.loadTags()
    await loadSnapshot()
    showMerge.value = false
    ElMessage.success('分类已合并，全部项目关系已保留并去重。')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '分类合并失败。')
  } finally {
    busy.value = false
  }
}

async function undoLatest() {
  if (!latestSnapshot.value) return
  try {
    await ElMessageBox.confirm(
      `撤销“${latestSnapshot.value.reason}”并恢复当时的全部分类和项目关系？`,
      '确认撤销迁移',
      { confirmButtonText: '确认撤销', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }

  busy.value = true
  try {
    const reason = await undoLatestCategoryMigration()
    await tagStore.loadTags()
    await loadSnapshot()
    ElMessage.success(reason ? `已撤销：${reason}` : '没有可撤销的分类迁移。')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '撤销迁移失败。')
  } finally {
    busy.value = false
  }
}
</script>

<style lang="scss" scoped>
.manager-alert,
.edit-alert {
  margin-bottom: 16px;
}

.manager-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}

.search-input {
  width: min(300px, 100%);
}

.sort-select {
  width: 180px;
}

.snapshot-tip,
.result-count {
  color: var(--text-tertiary);
  font-size: 0.78rem;
}

.snapshot-tip {
  margin-bottom: 10px;
}

.result-count {
  margin-top: 10px;
  text-align: right;
}

.category-cell {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.color-dot {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  border-radius: 50%;
}

.category-text,
.category-primary {
  min-width: 0;
}

.category-primary,
.category-secondary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-secondary {
  color: var(--text-tertiary);
  font-size: 0.75rem;
}

.emoji-input {
  width: 110px;
  margin-left: 12px;
}

.merge-select {
  width: 100%;
}

.merge-alert {
  margin-top: 16px;
}
</style>
