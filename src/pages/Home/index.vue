<template>
  <div class="home-page">
    <HomeLayout>
      <template #sidebar>
        <div class="sidebar-panel">
          <div class="category-import-bar">
            <div class="category-import-title">{{ t('categoryGovernance.toolTitle') }}</div>
            <div class="category-import-actions">
              <el-button
                class="category-tool-button"
                size="small"
                plain
                :disabled="tagStore.isMutating"
                @click="showImportTagDialog = true"
              >
                <el-icon><Upload /></el-icon>
                {{ t('categoryGovernance.importButton') }}
              </el-button>
              <el-button
                class="category-tool-button"
                size="small"
                plain
                :disabled="tagStore.isMutating"
                @click="showCategoryManager = true"
              >
                <el-icon><Tools /></el-icon>
                {{ t('categoryGovernance.manageButton') }}
              </el-button>
              <el-button
                class="category-tool-button"
                size="small"
                type="danger"
                plain
                :loading="tagStore.isMutating"
                :disabled="tagStore.tags.length === 0"
                @click="handleDeleteAllTags"
              >
                <el-icon><Delete /></el-icon>
                {{ t('categoryGovernance.deleteAllButton') }}
              </el-button>
            </div>
          </div>
          <SideMenu class="side-menu-content" />
        </div>
      </template>
      <template #main>
        <div class="home-content">
          <div class="repo-list-wrapper" :style="{ width: repoListWidth + 'px' }">
            <RepoList
              :repos="filteredRepos"
              :loading="loading"
              :syncing="syncing"
              :activeRepo="selectedRepo"
              @repo-click="handleRepoClick"
            />
          </div>
          <div
            v-if="selectedRepo"
            class="content-resize-handle"
            @mousedown="startContentResize"
          ></div>
          <div class="detail-wrapper" v-if="selectedRepo">
            <RepositoryDetailView
              :repo="selectedRepo"
              @close="handleCloseDetail"
              @unstarred="handleRepoUnstarred"
            />
          </div>
          <EmptyState v-else />
        </div>
      </template>
    </HomeLayout>

    <TagNameImportDialog v-model="showImportTagDialog" />
    <CategoryManagerDialog v-model="showCategoryManager" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Tools, Upload } from '@element-plus/icons-vue'
import { useRepoStore } from '@/stores/repo'
import { useTagStore } from '@/stores/tag'
import { useHighlightStore } from '@/stores/highlight'
import HomeLayout from '@/layouts/HomeLayout.vue'
import SideMenu from './components/SideMenu.vue'
import RepoList from './components/RepoList.vue'
import RepositoryDetailView from './components/RepositoryDetailView.vue'
import TagNameImportDialog from './components/TagNameImportDialog.vue'
import CategoryManagerDialog from './components/CategoryManagerDialog.vue'
import EmptyState from './components/EmptyState.vue'
import type { Repository } from '@/types'

const repoStore = useRepoStore()
const { t } = useI18n()
const tagStore = useTagStore()
const highlightStore = useHighlightStore()

const selectedRepo = ref<Repository | null>(null)
const showImportTagDialog = ref(false)
const showCategoryManager = ref(false)

const filteredRepos = computed(() => repoStore.filteredRepos)
const loading = computed(() => repoStore.isFetching)
const syncing = computed(() => repoStore.isSyncing)

const repoListWidth = ref(480)
const isContentResizing = ref(false)

const startContentResize = (event: MouseEvent) => {
  isContentResizing.value = true
  document.addEventListener('mousemove', handleContentResize)
  document.addEventListener('mouseup', stopContentResize)
  event.preventDefault()
}

const handleContentResize = (event: MouseEvent) => {
  if (!isContentResizing.value) return

  const sidebarWidth = (
    document.querySelector('.layout-sidebar') as HTMLElement | null
  )?.offsetWidth || 0
  const newWidth = event.clientX - sidebarWidth - 4

  if (newWidth >= 400 && newWidth <= 800) {
    repoListWidth.value = newWidth
  }
}

const stopContentResize = () => {
  isContentResizing.value = false
  document.removeEventListener('mousemove', handleContentResize)
  document.removeEventListener('mouseup', stopContentResize)
}

onUnmounted(stopContentResize)

const handleRepoClick = (repo: Repository) => {
  selectedRepo.value = repo
}

const handleCloseDetail = () => {
  selectedRepo.value = null
}

const handleRepoUnstarred = (repoId: number) => {
  if (selectedRepo.value?.id === repoId) {
    selectedRepo.value = null
  }
}

const handleDeleteAllTags = async () => {
  const tagCount = tagStore.tags.length
  if (tagCount === 0) return

  try {
    await ElMessageBox.confirm(
      t('categoryGovernance.deleteAllConfirm', { count: tagCount }),
      t('categoryGovernance.deleteAllTitle'),
      {
        confirmButtonText: t('categoryGovernance.deleteAllAction'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
  } catch {
    return
  }

  try {
    await tagStore.replaceAllTags([])
    repoStore.setSelectedTag(null)
    ElMessage.success(t('categoryGovernance.deleteAllSuccess', { count: tagCount }))
  } catch (error) {
    console.error('Failed to delete all categories:', error)
    ElMessage.error(t('categoryGovernance.deleteAllFailed'))
  }
}

onMounted(async () => {
  try {
    await Promise.all([tagStore.loadTags(), highlightStore.loadHighlights()])
    const result = await repoStore.loadRepos()

    if (result.status === 'success') {
      if (result.added || result.updated || result.removed) {
        ElMessage.success(t('categoryGovernance.syncComplete', {
          added: result.added,
          updated: result.updated,
          removed: result.removed
        }))
      }
      return
    }

    if (result.status === 'partial') {
      ElMessage.warning(t('categoryGovernance.syncPartial', { pages: result.failedPages.join(', ') }))
      return
    }

    if (result.status === 'error') {
      ElMessage.error(t('categoryGovernance.syncFailed', { message: result.message || t('error.unknown') }))
    }
  } catch (error) {
    console.error('Error loading repositories:', error)
    ElMessage.error(t('categoryGovernance.repositoryLoadFailed'))
  }
})
</script>

<style lang="scss" scoped>
.home-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
}

.sidebar-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.category-import-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 6px;
  padding: 7px 10px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.category-import-title {
  flex-shrink: 0;
  color: var(--text-primary);
  font-size: 0.76rem;
  font-weight: 600;
  white-space: nowrap;
}

.category-import-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  gap: 4px;
}

.category-tool-button {
  height: 28px;
  margin-left: 0;
  padding: 0 8px;
  font-size: 0.7rem;
  line-height: 1;
  border-radius: 4px;

  :deep(.el-icon) {
    margin-right: 3px;
    font-size: 0.78rem;
  }
}

.side-menu-content {
  flex: 1;
  min-height: 0;
}

.home-content {
  display: flex;
  height: 100%;
  position: relative;
}

.repo-list-wrapper {
  min-width: 400px;
  max-width: 800px;
  height: 100%;
  flex-shrink: 0;

  :deep(.repo-list) {
    width: 100%;
    border-right: none;
  }
}

.content-resize-handle {
  width: 4px;
  background: var(--border);
  cursor: col-resize;
  flex-shrink: 0;
  transition: background-color $transition-base;
  position: relative;

  &:hover {
    background: var(--el-color-primary);
  }

  &:active {
    background: var(--el-color-primary);
  }

  [data-theme='dark'] & {
    background: rgba(96, 165, 250, 0.2);

    &:hover {
      background: rgba(96, 165, 250, 0.5);
    }

    &:active {
      background: rgba(96, 165, 250, 0.7);
    }
  }

  @media (max-width: 768px) {
    display: none;
  }
}

.detail-wrapper {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}
</style>
