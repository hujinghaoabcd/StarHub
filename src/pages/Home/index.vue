<template>
  <div class="home-page">
    <HomeLayout>
      <template #sidebar>
        <div class="sidebar-panel">
          <div class="category-import-bar">
            <div class="category-import-title">分类工具</div>
            <div class="category-import-actions">
              <el-button
                class="category-tool-button"
                size="small"
                plain
                :disabled="tagStore.isMutating"
                @click="showImportTagDialog = true"
              >
                <el-icon><Upload /></el-icon>
                导入分类
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
                删除全部
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Upload } from '@element-plus/icons-vue'
import { useRepoStore } from '@/stores/repo'
import { useTagStore } from '@/stores/tag'
import { useHighlightStore } from '@/stores/highlight'
import HomeLayout from '@/layouts/HomeLayout.vue'
import SideMenu from './components/SideMenu.vue'
import RepoList from './components/RepoList.vue'
import RepositoryDetailView from './components/RepositoryDetailView.vue'
import TagNameImportDialog from './components/TagNameImportDialog.vue'
import EmptyState from './components/EmptyState.vue'
import type { Repository } from '@/types'

const repoStore = useRepoStore()
const tagStore = useTagStore()
const highlightStore = useHighlightStore()

const selectedRepo = ref<Repository | null>(null)
const showImportTagDialog = ref(false)

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
      `将删除全部 ${tagCount} 个分类及其项目关联，但不会删除任何项目。此操作无法撤销，是否继续？`,
      '删除所有分类',
      {
        confirmButtonText: '全部删除',
        cancelButtonText: '取消',
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
    ElMessage.success(`已删除全部 ${tagCount} 个分类`)
  } catch (error) {
    console.error('Failed to delete all categories:', error)
    ElMessage.error('删除全部分类失败，原有分类已保留。')
  }
}

onMounted(async () => {
  try {
    await Promise.all([tagStore.loadTags(), highlightStore.loadHighlights()])
    const result = await repoStore.loadRepos()

    if (result.status === 'success') {
      if (result.added || result.updated || result.removed) {
        ElMessage.success(
          `同步完成：新增 ${result.added}，更新 ${result.updated}，移除 ${result.removed}`
        )
      }
      return
    }

    if (result.status === 'partial') {
      ElMessage.warning(
        `同步未完成：第 ${result.failedPages.join(', ')} 页获取失败，已保留上一次完整数据。`
      )
      return
    }

    if (result.status === 'error') {
      ElMessage.error(
        `同步失败，已保留上一次完整数据：${result.message || '未知错误'}`
      )
    }
  } catch (error) {
    console.error('Error loading repositories:', error)
    ElMessage.error('仓库数据加载失败，请稍后重试。')
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
