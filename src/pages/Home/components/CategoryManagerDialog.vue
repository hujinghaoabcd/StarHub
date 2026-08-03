<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('categoryGovernance.managerTitle')"
    width="min(1040px, 96vw)"
    destroy-on-close
    @open="loadSnapshot"
    @close="emit('update:modelValue', false)"
  >
    <el-alert
      :title="t('categoryGovernance.managerNotice')"
      type="info"
      :closable="false"
      show-icon
      class="manager-alert"
    />

    <div class="manager-toolbar">
      <el-input
        v-model="query"
        clearable
        :placeholder="t('categoryGovernance.searchPlaceholder')"
        class="search-input"
      />
      <el-select v-model="sortMode" class="sort-select">
        <el-option :label="t('categoryGovernance.sortName')" value="name" />
        <el-option :label="t('categoryGovernance.sortCountDesc')" value="count-desc" />
        <el-option :label="t('categoryGovernance.sortCountAsc')" value="count-asc" />
        <el-option :label="t('categoryGovernance.sortUpdated')" value="updated" />
      </el-select>
      <el-checkbox v-model="emptyOnly">{{ t('categoryGovernance.emptyOnly') }}</el-checkbox>
      <el-button
        :disabled="!latestSnapshot || busy"
        @click="undoLatest"
      >
        <el-icon><RefreshLeft /></el-icon>
        {{ t('categoryGovernance.undoLast') }}
      </el-button>
    </div>

    <div v-if="latestSnapshot" class="snapshot-tip">
      {{ t('categoryGovernance.undoAvailable', { reason: latestSnapshot.reason, time: formatTime(latestSnapshot.createdAt) }) }}
    </div>

    <el-table :data="filteredTags" max-height="520" v-loading="busy">
      <el-table-column :label="t('categoryGovernance.category')" min-width="260">
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
      <el-table-column :label="t('categoryGovernance.registry')" width="110">
        <template #default="scope">
          <el-tag v-if="scope.row.registry?.managed" type="success" size="small">{{ t('categoryGovernance.formal') }}</el-tag>
          <el-tag v-else type="info" size="small">{{ t('categoryGovernance.ordinary') }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('categoryGovernance.repositoryCount')" width="110" sortable :sort-method="sortByCount">
        <template #default="scope">{{ scope.row.repos.length }}</template>
      </el-table-column>
      <el-table-column :label="t('categoryGovernance.parentCategory')" min-width="150">
        <template #default="scope">{{ scope.row.registry?.level1 || '—' }}</template>
      </el-table-column>
      <el-table-column :label="t('common.actions')" width="180" fixed="right">
        <template #default="scope">
          <el-button text type="primary" @click="openEdit(scope.row)">{{ t('common.edit') }}</el-button>
          <el-button text type="warning" @click="openMerge(scope.row)">{{ t('categoryGovernance.mergeInto') }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="result-count">{{ t('categoryGovernance.showing', { shown: filteredTags.length, total: tagStore.tags.length }) }}</div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('common.close') }}</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="showEdit"
    :title="t('categoryGovernance.safeEditTitle')"
    width="min(620px, 92vw)"
    append-to-body
  >
    <el-alert
      v-if="editingTag && !editingTag.registry"
      :title="t('categoryGovernance.ordinaryEditNotice')"
      type="info"
      :closable="false"
      class="edit-alert"
    />
    <el-form label-width="100px">
      <el-form-item :label="t('categoryGovernance.nameZh')">
        <el-input v-model="editForm.nameZh" maxlength="120" show-word-limit />
      </el-form-item>
      <el-form-item :label="t('categoryGovernance.nameEn')" v-if="editingTag?.registry">
        <el-input v-model="editForm.nameEn" maxlength="120" />
      </el-form-item>
      <el-form-item :label="t('categoryGovernance.aliases')" v-if="editingTag?.registry">
        <el-input v-model="editAliases" :placeholder="t('categoryGovernance.separatedPlaceholder')" />
      </el-form-item>
      <el-form-item :label="t('categoryGovernance.descriptionZh')" v-if="editingTag?.registry">
        <el-input v-model="editForm.descriptionZh" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item :label="t('categoryGovernance.descriptionEn')" v-if="editingTag?.registry">
        <el-input v-model="editForm.descriptionEn" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item :label="t('categoryGovernance.examples')" v-if="editingTag?.registry">
        <el-input v-model="editExamples" :placeholder="t('categoryGovernance.separatedPlaceholder')" />
      </el-form-item>
      <el-form-item :label="t('categoryGovernance.exclusions')" v-if="editingTag?.registry">
        <el-input v-model="editExclusions" :placeholder="t('categoryGovernance.separatedPlaceholder')" />
      </el-form-item>
      <el-form-item :label="t('categoryGovernance.parentCategory')" v-if="editingTag?.registry">
        <el-input v-model="editForm.level1" />
      </el-form-item>
      <el-form-item :label="t('categoryGovernance.displayName')" v-if="editingTag?.registry">
        <el-input v-model="editForm.level2" :placeholder="t('categoryGovernance.displayNamePlaceholder')" />
      </el-form-item>
      <el-form-item :label="t('categoryGovernance.appearance')">
        <el-color-picker v-model="editForm.color" />
        <el-input v-model="editForm.emoji" maxlength="2" class="emoji-input" placeholder="emoji" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showEdit = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="busy" :disabled="!editForm.nameZh.trim()" @click="saveEdit">
        {{ t('categoryGovernance.saveStableId') }}
      </el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="showMerge"
    :title="t('categoryGovernance.mergeTitle')"
    width="min(520px, 92vw)"
    append-to-body
  >
    <p>{{ t('categoryGovernance.mergePrompt', { source: mergeSource?.name || '' }) }}</p>
    <el-select v-model="mergeTargetId" filterable class="merge-select">
      <el-option
        v-for="tag in mergeTargets"
        :key="tag.id"
        :label="`${tag.name}（${tag.repos.length}）`"
        :value="tag.id"
      />
    </el-select>
    <el-alert
      :title="t('categoryGovernance.mergeNotice')"
      type="warning"
      :closable="false"
      class="merge-alert"
    />
    <template #footer>
      <el-button @click="showMerge = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="busy" :disabled="!mergeTargetId" @click="saveMerge">
        {{ t('categoryGovernance.backupAndMerge') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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
const { t, locale } = useI18n()
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
    return displayName(left).localeCompare(displayName(right), locale.value)
  })
})

const mergeTargets = computed(() => tagStore.tags
  .filter(tag => tag.id !== mergeSource.value?.id)
  .sort((left, right) => left.name.localeCompare(right.name, locale.value)))

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
  return new Date(value).toLocaleString(locale.value)
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
    ElMessage.success(t('categoryGovernance.updateSuccess'))
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t('categoryGovernance.updateFailed'))
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
      t('categoryGovernance.mergeConfirm', { source: mergeSource.value.name, target: target.name }),
      t('categoryGovernance.mergeConfirmTitle'),
      { confirmButtonText: t('categoryGovernance.backupAndMerge'), cancelButtonText: t('common.cancel'), type: 'warning' }
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
    ElMessage.success(t('categoryGovernance.mergeSuccess'))
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t('categoryGovernance.mergeFailed'))
  } finally {
    busy.value = false
  }
}

async function undoLatest() {
  if (!latestSnapshot.value) return
  try {
    await ElMessageBox.confirm(
      t('categoryGovernance.undoConfirm', { reason: latestSnapshot.value.reason }),
      t('categoryGovernance.undoTitle'),
      { confirmButtonText: t('categoryGovernance.undoConfirmButton'), cancelButtonText: t('common.cancel'), type: 'warning' }
    )
  } catch {
    return
  }

  busy.value = true
  try {
    const reason = await undoLatestCategoryMigration()
    await tagStore.loadTags()
    await loadSnapshot()
    ElMessage.success(reason ? t('categoryGovernance.undoSuccess', { reason }) : t('categoryGovernance.noUndo'))
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : t('categoryGovernance.undoFailed'))
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
