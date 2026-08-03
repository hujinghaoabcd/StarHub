<template>
  <div class="home-page">
    <HomeLayout>
      <template #sidebar>
        <div class="sidebar-panel">
          <div class="category-import-bar">
            <div>
              <div class="category-import-title">分类工具</div>
              <div class="category-import-note">只导入名称，不分配项目</div>
            </div>
            <el-button
              size="small"
              plain
              @click="showImportTagDialog = true"
            >
              <el-icon><Upload /></el-icon>
              导入分类
            </el-button>
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useRepoStore } from '@/stores/repo'
import { useTagStore } from '@/stores/tag'
import HomeLayout from '@/layouts/HomeLayout.vue'
import SideMenu from './components/SideMenu.vue'
import RepoList from './components/RepoList.vue'
import RepositoryDetailView from './components/RepositoryDetailView.vue'
import TagNameImportDialog from './components/TagNameImportDialog.vue'
import EmptyState from './components/EmptyState.vue'
import type { Repository } from '@/types'

const repoStore = useRepoStore()
const tagStore = useTagStore()

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

onMounted(async () => {
  try {
    await tagStore.loadTags()
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
  gap: 10px;
  padding: 10px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.category-import-title {
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 600;
}

.category-import-note {
  margin-top: 2px;
  color: var(--text-tertiary);
  font-size: 0.68rem;
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
