<template>
  <div class="repo-list">
    <div class="repo-list-header">
      <div class="header-left">
        <el-button
          v-if="!selectMode"
          size="small"
          type="primary"
          plain
          @click="enterSelectMode"
        >
          <el-icon><Check /></el-icon>
          <span>{{ t('common.select') }}</span>
        </el-button>

        <el-checkbox
          v-else
          v-model="selectAll"
          :indeterminate="isIndeterminate"
          @change="handleSelectAll"
        />

        <div class="repo-count">
          <template v-if="selectMode && selectedRepos.size > 0">
            {{ selectedRepos.size }} / {{ totalCount }} {{ t('common.selected') }}
          </template>
          <template v-else>
            {{ totalCount }} {{ totalCount === 1 ? t('home.repo') : t('home.repos') }}
          </template>
        </div>
      </div>

      <div v-if="selectMode" class="header-actions">
        <el-button
          v-if="selectedRepos.size > 0"
          size="small"
          type="primary"
          @click="handleBatchTag"
        >
          <el-icon><Collection /></el-icon>
          {{ t('batchTag.title') }} ({{ selectedRepos.size }})
        </el-button>
        <el-button size="small" text @click="exitSelectMode">
          <el-icon><Close /></el-icon>
          {{ selectedRepos.size > 0 ? t('common.cancel') : t('common.exit') }}
        </el-button>
      </div>

      <div v-else class="header-actions sort-actions">
        <el-dropdown trigger="click" @command="handleSortChange">
          <el-button size="small" text>
            <el-icon><Sort /></el-icon>
            <span>{{ sortLabel }}</span>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                command="updated"
                :class="{ 'is-active': sortBy === 'updated' }"
              >
                <el-icon><Clock /></el-icon>
                <span>按更新时间</span>
                <el-icon v-if="sortBy === 'updated'" class="check-icon">
                  <Check />
                </el-icon>
              </el-dropdown-item>
              <el-dropdown-item
                command="stars"
                :class="{ 'is-active': sortBy === 'stars' }"
              >
                <el-icon><Star /></el-icon>
                <span>按 Star 数</span>
                <el-icon v-if="sortBy === 'stars'" class="check-icon">
                  <Check />
                </el-icon>
              </el-dropdown-item>
              <el-dropdown-item
                command="created"
                :class="{ 'is-active': sortBy === 'created' }"
              >
                <el-icon><Calendar /></el-icon>
                <span>按创建时间</span>
                <el-icon v-if="sortBy === 'created'" class="check-icon">
                  <Check />
                </el-icon>
              </el-dropdown-item>
              <el-dropdown-item
                command="name"
                :class="{ 'is-active': sortBy === 'name' }"
              >
                <span class="name-sort-icon">A–Z</span>
                <span>按项目名称</span>
                <el-icon v-if="sortBy === 'name'" class="check-icon">
                  <Check />
                </el-icon>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-button
          size="small"
          text
          :title="sortOrder === 'asc' ? '当前升序，点击切换为降序' : '当前降序，点击切换为升序'"
          @click="toggleSortOrder"
        >
          <span class="sort-direction">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
          {{ sortOrder === 'asc' ? '升序' : '降序' }}
        </el-button>
      </div>
    </div>

    <div class="repo-list-content">
      <div v-if="loading" class="loading-container">
        <el-skeleton
          v-for="index in 5"
          :key="index"
          :rows="3"
          animated
          class="repo-skeleton"
        />
      </div>

      <div v-else-if="repos.length === 0" class="empty-state">
        <el-icon :size="64" class="empty-icon"><Box /></el-icon>
        <p>{{ t('home.noRepos') }}</p>
      </div>

      <div v-else class="repo-items">
        <RepoCard
          v-for="repo in repos"
          :key="`repo-${repo.id}`"
          :repo="repo"
          :is-active="activeRepo?.id === repo.id"
          :selected="selectedRepos.has(repo.id)"
          :select-mode="selectMode"
          @click="handleRepoClick(repo)"
          @select="handleRepoSelect(repo.id, $event)"
        />
      </div>
    </div>

    <div
      v-if="!loading && totalCount > 0"
      class="repo-list-pagination"
    >
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="totalCount"
        :page-sizes="repositoryPageSizes"
        layout="sizes, prev, pager, next"
        :pager-count="5"
        class="repo-pagination"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <BatchTagDialog
      v-model="showBatchTagDialog"
      :repo-count="selectedRepos.size"
      :tags="tagStore.tags"
      @confirm="handleBatchTagConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Box,
  Calendar,
  Check,
  Clock,
  Close,
  Collection,
  Sort,
  Star
} from '@element-plus/icons-vue'
import { useRepoStore } from '@/stores/repo'
import { useTagStore } from '@/stores/tag'
import {
  REPOSITORY_PAGE_SIZES,
  type RepositorySortField
} from '@/services/repositoryView'
import RepoCard from './RepoCard.vue'
import BatchTagDialog from './BatchTagDialog.vue'
import type { Repository } from '@/types'

const props = defineProps<{
  repos: Repository[]
  loading: boolean
  syncing?: boolean
  activeRepo?: Repository | null
}>()

const emit = defineEmits<{
  repoClick: [repo: Repository]
}>()

const { t } = useI18n()
const repoStore = useRepoStore()
const tagStore = useTagStore()

const selectedRepos = ref<Set<number>>(new Set())
const selectMode = ref(false)
const showBatchTagDialog = ref(false)

const sortBy = computed(() => repoStore.sortBy)
const sortOrder = computed(() => repoStore.sortOrder)
const repositoryPageSizes = [...REPOSITORY_PAGE_SIZES]

const sortLabel = computed(() => {
  switch (sortBy.value) {
    case 'stars':
      return '按 Star 数'
    case 'created':
      return '按创建时间'
    case 'name':
      return '按项目名称'
    case 'updated':
    default:
      return '按更新时间'
  }
})

const handleSortChange = (field: RepositorySortField) => {
  repoStore.setSortBy(field)
}

const toggleSortOrder = () => {
  repoStore.toggleSortOrder()
}

const selectAll = computed({
  get: () =>
    props.repos.length > 0 &&
    props.repos.every(repo => selectedRepos.value.has(repo.id)),
  set: (checked: boolean) => {
    handleSelectAll(checked)
  }
})

const isIndeterminate = computed(() => {
  const selectedOnPage = props.repos.filter(repo =>
    selectedRepos.value.has(repo.id)
  ).length
  return selectedOnPage > 0 && selectedOnPage < props.repos.length
})

const handleSelectAll = (checked: boolean) => {
  props.repos.forEach(repo => {
    if (checked) {
      selectedRepos.value.add(repo.id)
    } else {
      selectedRepos.value.delete(repo.id)
    }
  })
}

const handleRepoClick = (repo: Repository) => {
  if (selectMode.value) {
    handleRepoSelect(repo.id, !selectedRepos.value.has(repo.id))
    return
  }

  emit('repoClick', repo)
}

const enterSelectMode = () => {
  selectMode.value = true
}

const exitSelectMode = () => {
  selectedRepos.value.clear()
  selectMode.value = false
}

const handleRepoSelect = (repoId: number, selected: boolean) => {
  if (selected) {
    selectedRepos.value.add(repoId)
  } else {
    selectedRepos.value.delete(repoId)
  }
}

const clearSelection = () => {
  selectedRepos.value.clear()
}

const handleBatchTag = () => {
  if (selectedRepos.value.size === 0) {
    ElMessage.warning('请先选择仓库')
    return
  }

  if (tagStore.tags.length === 0) {
    ElMessage.warning(t('batchTag.pleaseCreateTags'))
    return
  }

  showBatchTagDialog.value = true
}

const handleBatchTagConfirm = async (
  selectedTagIds: string[],
  mode: 'add' | 'replace' = 'add'
) => {
  if (selectedTagIds.length === 0 && mode === 'replace') {
    try {
      await ElMessageBox.confirm(
        '未选择任何分类，将移除所选仓库的所有分类。是否继续？',
        '确认操作',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }
  }

  const repoIds = Array.from(selectedRepos.value)
  const loadingMessage = ElMessage({
    message: `正在为 ${repoIds.length} 个仓库${mode === 'add' ? '添加' : '设置'}分类...`,
    type: 'info',
    duration: 0
  })

  let successCount = 0
  let totalOperations = 0

  try {
    for (const repoId of repoIds) {
      try {
        const currentTags = await tagStore.getRepoTags(repoId)
        const currentTagIds = new Set(currentTags.map(tag => tag.id))

        if (mode === 'replace') {
          for (const tagId of currentTagIds) {
            if (!selectedTagIds.includes(tagId)) {
              await tagStore.removeTagFromRepo(repoId, tagId)
              totalOperations++
            }
          }
        }

        for (const tagId of selectedTagIds) {
          if (!currentTagIds.has(tagId)) {
            await tagStore.addTagToRepo(repoId, tagId)
            totalOperations++
          }
        }

        successCount++
      } catch (error) {
        console.error(`Failed to update tags for repo ${repoId}:`, error)
      }
    }

    await tagStore.loadTags()
    loadingMessage.close()

    if (totalOperations > 0) {
      ElMessage.success(`成功更新 ${successCount} 个仓库的分类`)
    } else {
      ElMessage.info('所选仓库的分类无需更新')
    }

    clearSelection()
  } catch (error) {
    loadingMessage.close()
    ElMessage.error('批量设置分类失败')
    console.error('Batch tag failed:', error)
  }
}

const currentPage = computed({
  get: () => repoStore.currentPage,
  set: (page: number) => repoStore.setCurrentPage(page)
})

const pageSize = computed({
  get: () => repoStore.pageSize,
  set: (size: number) => repoStore.setPageSize(size)
})

const totalCount = computed(() => repoStore.totalFilteredCount)

const handlePageChange = (page: number) => {
  repoStore.setCurrentPage(page)
  document
    .querySelector('.repo-list-content')
    ?.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleSizeChange = (size: number) => {
  repoStore.setPageSize(size)
}

watch(
  () => new Set(repoStore.repos.map(repo => repo.id)),
  validIds => {
    for (const repoId of selectedRepos.value) {
      if (!validIds.has(repoId)) {
        selectedRepos.value.delete(repoId)
      }
    }
  }
)
</script>

<style lang="scss" scoped>
.repo-list {
  display: flex;
  flex-direction: column;
  width: 480px;
  min-width: 400px;
  height: 100%;
  background: var(--bg-primary);
  border-right: 1px solid var(--border);

  [data-theme='dark'] & {
    background: #1c2333;
    border-right-color: rgba(96, 165, 250, 0.2);
  }
}

.repo-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  min-height: 56px;
  padding: $spacing-md $spacing-lg;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.header-left,
.header-actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.header-left {
  min-width: 0;
  flex: 1;
}

.header-actions {
  flex-shrink: 0;
}

.sort-actions {
  gap: 2px;
}

.repo-count {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sort-direction,
.name-sort-icon {
  color: var(--el-color-primary);
  font-weight: 700;
}

.name-sort-icon {
  width: 18px;
  font-size: 0.68rem;
  text-align: center;
}

.repo-list-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: $spacing-sm;
}

.repo-items,
.loading-container {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.loading-container {
  padding: $spacing-md;
}

.repo-skeleton {
  padding: $spacing-md;
  background: var(--bg-secondary);
  border-radius: $radius-md;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-tertiary);
}

.empty-icon {
  margin-bottom: $spacing-md;
  opacity: 0.5;
}

.repo-list-pagination {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
  padding: $spacing-sm $spacing-md;
  overflow-x: auto;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;

  &.is-active {
    color: var(--el-color-primary);
    font-weight: 500;
  }

  .check-icon {
    margin-left: auto;
    color: var(--el-color-primary);
  }
}

@media (max-width: 1024px) {
  .repo-list {
    width: 360px;
    min-width: 320px;
  }

  .repo-list-header {
    padding: $spacing-sm;
  }
}

@media (max-width: 768px) {
  .repo-list {
    width: 100%;
    min-width: 0;
    border-right: none;
  }

  .repo-list-header {
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions {
    justify-content: flex-end;
  }
}
</style>
