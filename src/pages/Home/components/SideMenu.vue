<template>
  <div class="side-menu">
    <!-- All Repos and Untagged Menu Items -->
    <div class="menu-section">
      <div
        class="menu-item"
        :class="{ active: filterType === 'all' }"
        @click="handleFilterType('all')"
      >
        <el-icon class="menu-icon"><Grid /></el-icon>
        <span class="menu-text">{{ t('menu.allRepos') }}</span>
        <span v-if="syncing" class="menu-sync-icon">
          <el-icon class="is-loading"><Loading /></el-icon>
        </span>
        <span class="menu-count">{{ reposCount }}</span>
      </div>
      <div
        class="menu-item"
        :class="{ active: filterType === 'untagged' }"
        @click="handleFilterType('untagged')"
      >
        <el-icon class="menu-icon"><Collection /></el-icon>
        <span class="menu-text">{{ t('menu.untagged') }}</span>
        <span class="menu-count">{{ untaggedCount }}</span>
      </div>
    </div>

    <div class="menu-section">
      <div class="menu-header collapsible" @click="categoryExpanded = !categoryExpanded">
        <h3>{{ t('menu.tags') }}</h3>
        <div class="menu-actions" @click.stop>
          <el-tag class="experimental-badge" size="small" type="warning" effect="plain">
            {{ t('tag.experimental') }}
          </el-tag>
          <el-tooltip :content="activeClassificationTask ? t('tag.openTask') : t('tag.autoClassify')" placement="top">
            <el-button
              text
              circle
              size="small"
              :disabled="classificationTaskStore.loading"
              @click="handleAutoClassify"
              class="classify-btn"
            >
              <el-icon><MagicStick /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip
            v-if="lastClassificationCommit"
            :content="t('tag.undoClassification')"
            placement="top"
          >
            <el-button
              text
              circle
              size="small"
              :disabled="isClassifying || tagStore.isMutating"
              class="undo-classify-btn"
              @click="handleUndoClassification"
            >
              <el-icon><RefreshLeft /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip :content="t('tag.pauseTask')" placement="top" v-if="isClassifying">
            <el-button
              text
              circle
              size="small"
              type="warning"
              @click="handleStopClassifying"
              class="stop-classify-btn"
            >
              <el-icon><VideoPause /></el-icon>
            </el-button>
          </el-tooltip>
          <el-button
            text
            circle
            size="small"
            :disabled="isClassifying"
            @click="showCreateTagDialog = true"
          >
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
        <el-icon class="collapse-icon" :class="{ expanded: categoryExpanded }">
          <ArrowDown />
        </el-icon>
      </div>
      <el-collapse-transition>
        <div v-show="categoryExpanded" class="tag-list">
        <div
          v-for="tag in tags"
          :key="tag.id"
          class="tag-item"
          :class="{ active: selectedTagId === tag.id }"
          @click="handleTagClick(tag.id)"
        >
          <span
            class="tag-color"
            :style="{ backgroundColor: tag.color }"
          ></span>
          <span v-if="tag.emoji" class="tag-emoji">{{ tag.emoji }}</span>
          <span class="tag-name">{{ tag.name }}</span>
          <span class="tag-count">{{ tag.repos?.length || 0 }}</span>
          <el-button
            text
            circle
            size="small"
            class="tag-delete"
            @click.stop="handleDeleteTag(tag.id)"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <div v-if="tags.length === 0" class="empty-tags">
          {{ t('tag.create') }}
        </div>
        </div>
      </el-collapse-transition>
    </div>

    <div class="menu-section">
      <div class="menu-header collapsible" @click="languageExpanded = !languageExpanded">
        <h3>{{ t('menu.languages') }}</h3>
        <el-icon class="collapse-icon" :class="{ expanded: languageExpanded }">
          <ArrowDown />
        </el-icon>
      </div>
      <el-collapse-transition>
        <div v-show="languageExpanded" class="language-list">
        <div
          v-for="lang in languagesWithCount"
          :key="lang.name"
          class="language-item"
          :class="{ active: selectedLanguage === lang.name }"
          @click="handleLanguageClick(lang.name)"
        >
          <span
            class="language-dot"
            :style="{ backgroundColor: getLanguageColor(lang.name) }"
          ></span>
          <span class="language-name">{{ lang.name }}</span>
          <span class="language-count">{{ lang.count }}</span>
        </div>
        <div
          v-if="selectedLanguage"
          class="language-item clear-filter"
          @click="handleClearLanguage"
        >
          <el-icon><Close /></el-icon>
          {{ t('common.reset') }}
        </div>
      </div>
      </el-collapse-transition>
    </div>

    <el-dialog
      v-model="showCreateTagDialog"
      :title="t('tag.create')"
      width="400px"
    >
      <el-form :model="newTag" label-width="80px">
        <el-form-item :label="t('tag.emoji')">
          <el-input 
            v-model="newTag.emoji" 
            :placeholder="t('tag.emojiPlaceholder')"
            maxlength="2"
            style="width: 100px;"
          />
          <div class="form-tip">{{ t('tag.emojiTip') }}</div>
        </el-form-item>
        <el-form-item :label="t('tag.name')">
          <el-input v-model="newTag.name" :placeholder="t('tag.name')" />
        </el-form-item>
        <el-form-item :label="t('tag.color')">
          <el-color-picker v-model="newTag.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateTagDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleCreateTag">{{ t('tag.create') }}</el-button>
      </template>
    </el-dialog>

    <ClassificationReviewDialog
      v-model="showClassificationReview"
      :task="activeClassificationTask"
      :categories="classificationCategories"
      :repositories="repoStore.repos"
      :action-busy="classificationActionBusy"
      :commit-busy="classificationCommitBusy"
      @pause="handleStopClassifying"
      @resume="handleResumeClassification"
      @retry="handleRetryClassification"
      @cancel-task="handleCancelClassification"
      @discard="handleDiscardClassification"
      @confirm="handleClassificationReviewConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTagStore } from '@/stores/tag'
import { useRepoStore } from '@/stores/repo'
import { useClassificationTaskStore } from '@/stores/classificationTask'
import {
  assertClassificationReviewCompatible,
  assertClassificationTaskCompatible
} from '@/services/classificationTasks'
import { getLanguageColor } from '@/utils/languageColors'
import {
  ArrowDown,
  Close,
  Collection,
  Grid,
  Loading,
  MagicStick,
  Plus,
  RefreshLeft,
  VideoPause
} from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage, ElNotification } from 'element-plus'
import ClassificationReviewDialog from './ClassificationReviewDialog.vue'
import type {
  ClassificationAssignment,
  ClassificationCategory,
  ClassificationCommitReceipt
} from '@/types'

const { t, locale } = useI18n()

const tagStore = useTagStore()
const repoStore = useRepoStore()
const classificationTaskStore = useClassificationTaskStore()

const showCreateTagDialog = ref(false)
const newTag = ref({ name: '', emoji: '', color: '#409EFF' })
const selectedTagId = computed(() => repoStore.selectedTag)
const selectedLanguage = computed(() => repoStore.selectedLanguage)
const filterType = computed(() => repoStore.filterType)
const reposCount = computed(() => repoStore.repos.length)
const untaggedCount = computed(() => repoStore.untaggedRepos.length)
const syncing = computed(() => repoStore.isSyncing)
const languageExpanded = ref(true)
const categoryExpanded = ref(true)
const isClassifying = computed(() => classificationTaskStore.running)
const activeClassificationTask = computed(
  () => classificationTaskStore.activeTask
)
const showClassificationReview = ref(false)
const classificationCategories = ref<ClassificationCategory[]>([])
const classificationActionBusy = ref(false)
const classificationCommitBusy = ref(false)
const lastClassificationCommit = ref<ClassificationCommitReceipt | null>(null)

const tags = computed(() => {
  // 按名称字母顺序排序
  return [...tagStore.tags].sort((a, b) => {
    return a.name.localeCompare(b.name, 'zh-CN')
  })
})
const languages = computed(() => repoStore.languages)

// Calculate language counts
const languagesWithCount = computed(() => {
  const langCountMap = new Map<string, number>()
  repoStore.repos.forEach((repo: any) => {
    if (repo.language) {
      langCountMap.set(repo.language, (langCountMap.get(repo.language) || 0) + 1)
    }
  })
  
  return languages.value.map((lang: string) => ({
    name: lang,
    count: langCountMap.get(lang) || 0
  }))
})

const handleFilterType = (type: 'all' | 'untagged') => {
  repoStore.setFilterType(type)
  // Clear tag and language filters when switching to all/untagged
  repoStore.setSelectedTag(null)
  repoStore.setSelectedLanguage(null)
  // Reset to first page
  repoStore.setCurrentPage(1)
}

const handleTagClick = (tagId: string) => {
  // Set filter type to 'all' when selecting a tag
  repoStore.setFilterType('all')
  // Clear language filter when selecting a tag
  repoStore.setSelectedLanguage(null)
  // Reset to first page
  repoStore.setCurrentPage(1)
  
  if (repoStore.selectedTag === tagId) {
    repoStore.setSelectedTag(null)
  } else {
    repoStore.setSelectedTag(tagId)
  }
  
}

const handleLanguageClick = (language: string) => {
  // Set filter type to 'all' when selecting a language
  repoStore.setFilterType('all')
  // Clear tag filter when selecting a language
  repoStore.setSelectedTag(null)
  if (repoStore.selectedLanguage === language) {
    repoStore.setSelectedLanguage(null)
  } else {
    repoStore.setSelectedLanguage(language)
  }
}

const handleClearLanguage = () => {
  repoStore.setSelectedLanguage(null)
}

const handleCreateTag = async () => {
  if (!newTag.value.name.trim()) {
    return
  }

  try {
    await tagStore.createTag(newTag.value.name, newTag.value.color, newTag.value.emoji)
    showCreateTagDialog.value = false
    newTag.value = { name: '', emoji: '', color: '#409EFF' }
  } catch (error) {
    console.error('Failed to create tag:', error)
  }
}

const handleDeleteTag = async (tagId: string) => {
  try {
    await ElMessageBox.confirm(
      t('tag.deleteConfirm'),
      t('tag.delete'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
    await tagStore.deleteTag(tagId)
  } catch (error) {
    // User cancelled
  }
}

async function buildCurrentClassificationRegistry() {
  const { getCategoryPresets } = await import('@/config/categories')
  const {
    buildClassificationRegistry
  } = await import('@/services/classificationRegistry')
  const registry = buildClassificationRegistry(
    tagStore.tags,
    getCategoryPresets(),
    locale.value
  )
  classificationCategories.value = registry
  return registry
}

function repositoriesWithoutCategories() {
  const taggedRepositoryIds = new Set<number>()
  tagStore.tags.forEach(tag => {
    tag.repos.forEach(repositoryId => taggedRepositoryIds.add(repositoryId))
  })
  return repoStore.repos.filter(
    repository => !taggedRepositoryIds.has(repository.id)
  )
}

async function ensureAIReady() {
  const { isAIConfigured, getAIConfig } = await import('@/config/ai')
  if (!isAIConfigured()) {
    try {
      await ElMessageBox.confirm(
        t('tag.needAIConfig'),
        t('tag.needAIConfigTitle'),
        {
          confirmButtonText: t('tag.goToConfig'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        }
      )
      window.location.hash = '#/settings'
    } catch {
      // User cancelled.
    }
    return null
  }

  const config = getAIConfig()
  try {
    const { resolveAIEndpoint } = await import('@/utils/aiEndpoint')
    const endpoint = resolveAIEndpoint(config)
    if (endpoint.isCustom) {
      await ElMessageBox.confirm(
        t('settings.customEndpointConfirm', { host: endpoint.host }),
        t('settings.customEndpointTitle'),
        {
          confirmButtonText: t('settings.confirmEndpoint'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        }
      )
    }
    return config
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AIEndpointValidationError'
    ) {
      ElMessage.error(error.message)
    }
    return null
  }
}

function notifyTaskResult() {
  const task = classificationTaskStore.activeTask
  if (!task) return
  if (task.status === 'completed') {
    ElNotification({
      title: t('tag.reviewTitle'),
      message: t('tag.reviewReady', {
        success: task.successCount,
        failed: task.failedCount
      }),
      type: 'success',
      duration: 6000
    })
  } else if (task.status === 'partial') {
    ElNotification({
      title: t('tag.classifyPartial'),
      message: t('tag.classifyPartialMessage', {
        success: task.successCount,
        failed: task.failedCount
      }),
      type: 'warning',
      duration: 6000
    })
  }
}

async function startActiveClassification() {
  const task = classificationTaskStore.activeTask
  if (!task || classificationTaskStore.running) return
  const config = await ensureAIReady()
  if (!config) return
  const registry = await buildCurrentClassificationRegistry()

  try {
    assertClassificationTaskCompatible(task, registry)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error))
    return
  }

  classificationActionBusy.value = true
  try {
    const runPromise = classificationTaskStore.run(
      repoStore.repos,
      registry
    )
    void runPromise
      .then(() => notifyTaskResult())
      .catch(error => {
        ElMessage.error(error instanceof Error ? error.message : String(error))
      })
  } finally {
    classificationActionBusy.value = false
  }
}

const handleStopClassifying = async () => {
  classificationActionBusy.value = true
  try {
    await classificationTaskStore.pause()
    ElMessage.warning(t('tag.taskPaused'))
  } finally {
    classificationActionBusy.value = false
  }
}

const handleResumeClassification = () => {
  void startActiveClassification()
}

const handleRetryClassification = async () => {
  const config = await ensureAIReady()
  if (!config) return
  const registry = await buildCurrentClassificationRegistry()
  const task = classificationTaskStore.activeTask
  if (!task) return
  try {
    assertClassificationTaskCompatible(task, registry)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error))
    return
  }
  classificationActionBusy.value = true
  try {
    const retryPromise = classificationTaskStore.retryFailures(
      repoStore.repos,
      registry
    )
    void retryPromise
      .then(() => notifyTaskResult())
      .catch(error => {
        ElMessage.error(error instanceof Error ? error.message : String(error))
      })
  } finally {
    classificationActionBusy.value = false
  }
}

const handleCancelClassification = async () => {
  try {
    await ElMessageBox.confirm(
      t('tag.cancelTaskConfirm'),
      t('tag.cancelTask'),
      {
        confirmButtonText: t('tag.cancelTask'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  classificationActionBusy.value = true
  try {
    await classificationTaskStore.cancel()
    ElMessage.warning(t('tag.taskCancelled'))
  } finally {
    classificationActionBusy.value = false
  }
}

const handleDiscardClassification = async () => {
  try {
    await ElMessageBox.confirm(
      t('tag.discardTaskConfirm'),
      t('tag.discardTask'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  classificationActionBusy.value = true
  try {
    await classificationTaskStore.discard()
    showClassificationReview.value = false
  } finally {
    classificationActionBusy.value = false
  }
}

const handleAutoClassify = async () => {
  const existingTask = classificationTaskStore.activeTask
  if (
    existingTask && !existingTask.committedAt
  ) {
    await buildCurrentClassificationRegistry()
    showClassificationReview.value = true
    return
  }

  if (repoStore.repos.length === 0) {
    ElMessage.warning(t('tag.noReposToClassify'))
    return
  }
  const config = await ensureAIReady()
  if (!config) return
  const registry = await buildCurrentClassificationRegistry()
  if (registry.length === 0) {
    ElMessage.warning(t('tag.reviewNoCategories'))
    return
  }

  const repositories = repositoriesWithoutCategories()
  if (repositories.length === 0) {
    ElMessage.success(t('tag.allClassified'))
    return
  }

  const { estimateClassificationUsage } = await import(
    '@/services/classificationProtocol'
  )
  const batchSize = config.batchSize || 50
  const estimate = estimateClassificationUsage(
    repositories,
    registry,
    batchSize
  )
  try {
    await ElMessageBox.confirm(
      t('tag.taskStartMessage', {
        count: estimate.repositoryCount,
        batches: estimate.batchCount,
        input: new Intl.NumberFormat().format(estimate.estimatedInputTokens),
        output: new Intl.NumberFormat().format(estimate.estimatedOutputTokens)
      }),
      t('tag.taskStartTitle'),
      {
        confirmButtonText: t('tag.startTask'),
        cancelButtonText: t('common.cancel'),
        type: 'info'
      }
    )
  } catch {
    return
  }

  classificationActionBusy.value = true
  try {
    await classificationTaskStore.create(
      repositories,
      registry,
      batchSize
    )
    showClassificationReview.value = true
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error))
    return
  } finally {
    classificationActionBusy.value = false
  }

  void startActiveClassification()
}

const handleClassificationReviewConfirm = async (
  assignments: ClassificationAssignment[]
) => {
  const task = classificationTaskStore.activeTask
  if (!task) return
  classificationCommitBusy.value = true

  try {
    const registry = await buildCurrentClassificationRegistry()
    assertClassificationReviewCompatible(task, registry)

    const receipt = await tagStore.applyClassificationAssignments(assignments)
    await classificationTaskStore.markCommitted(receipt.addedRelations.length)
    lastClassificationCommit.value = receipt.addedRelations.length > 0
      ? receipt
      : null
    repoStore.setCurrentPage(1)
    showClassificationReview.value = false
    ElNotification({
      title: t('tag.classifySuccess'),
      message: t('tag.classificationCommitted', {
        count: receipt.addedRelations.length
      }),
      type: 'success',
      duration: 5000
    })
  } catch (error) {
    console.error('Failed to commit AI classification review:', error)
    ElMessage.error(error instanceof Error ? error.message : String(error))
  } finally {
    classificationCommitBusy.value = false
  }
}
const handleUndoClassification = async () => {
  const receipt = lastClassificationCommit.value
  if (!receipt) return

  try {
    await ElMessageBox.confirm(
      t('tag.undoClassificationConfirm', {
        count: receipt.addedRelations.length
      }),
      t('tag.undoClassification'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
    await tagStore.undoClassificationCommit(receipt)
    lastClassificationCommit.value = null
    ElMessage.success(t('tag.undoClassificationSuccess'))
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('Failed to undo AI classification:', error)
    }
  }
}

onMounted(() => {
  void classificationTaskStore.loadLatest()
})

onUnmounted(() => {
  if (classificationTaskStore.running) {
    void classificationTaskStore.pause()
  }
})
</script>

<style lang="scss" scoped>
.side-menu {
  padding: $spacing-md;
  height: 100%;
  overflow-y: auto;
  background: var(--bg-secondary);
  
  // 深色模式下使用与应用一致的背景色
  [data-theme='dark'] & {
    background: #252d3d !important;
  }

  // 明亮模式按钮样式
  [data-theme='light'] & {
    .el-button.is-text,
    .el-button.is-circle {
      color: var(--text-secondary) !important;
      
      &:hover {
        color: var(--text-primary) !important;
        background-color: var(--bg-tertiary) !important;
      }
      
      .el-icon {
        color: inherit !important;
      }
    }
  }

  // 确保暗黑模式下所有按钮可见
  [data-theme='dark'] & {
    .el-button.is-text,
    .el-button.is-circle {
      color: #c0c0c0 !important;
      
      &:hover {
        color: #ffffff !important;
        background-color: #353535 !important;
      }
      
      .el-icon {
        color: inherit !important;
      }
    }
  }
}

.menu-item {
  display: flex;
  align-items: center;
  padding: $spacing-sm $spacing-md;
  margin-bottom: $spacing-xs;
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-base;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-secondary);

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  &.active {
    background: rgba(64, 158, 255, 0.15) !important;
    border-color: rgba(64, 158, 255, 0.4) !important;
    color: #409EFF !important;
    font-weight: 500;
    
    .menu-icon {
      color: #409EFF !important;
    }
    
    .menu-text {
      color: #409EFF !important;
    }
    
    .menu-sync-icon {
      color: #409EFF !important;
    }
    
    .menu-count {
      color: var(--text-tertiary) !important;
    }
  }

  .menu-icon {
    margin-right: $spacing-sm;
    font-size: 18px;
    flex-shrink: 0;
    color: var(--text-secondary);
    transition: color $transition-base;
  }

  .menu-text {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    transition: color $transition-base;
  }

  .menu-sync-icon {
    margin-right: $spacing-xs;
    font-size: 14px;
    color: var(--el-color-primary);
    
    .is-loading {
      animation: rotating 2s linear infinite;
    }
  }

  .menu-count {
    font-weight: 600;
    font-size: 0.8125rem;
    margin-left: auto;
    color: var(--text-tertiary);
    transition: color $transition-base;
  }
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.menu-section {
  margin-bottom: $spacing-xl;

  .menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-md;

    &.collapsible {
      cursor: pointer;
      padding: $spacing-xs $spacing-sm;
      border-radius: $radius-md;
      transition: background-color $transition-base;

      &:hover {
        background: var(--bg-tertiary);
      }
    }

    h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }

    .collapse-icon {
      font-size: 14px;
      color: var(--text-tertiary);
      transition: all $transition-base;
      margin-left: $spacing-xs;

      &.expanded {
        transform: rotate(180deg);
      }
    }

    &.collapsible:hover {
      .collapse-icon {
        color: var(--text-secondary);
      }
    }

    .menu-actions {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
      margin-left: auto;

      .experimental-badge {
        height: 20px;
        padding: 0 5px;
        font-size: 0.65rem;
      }

      .el-button {
        &.is-loading {
          color: var(--el-color-primary) !important;
        }
      }

      :deep(.el-button) {
        .el-icon {
          color: inherit !important;
        }
      }

      .stop-classify-btn {
        color: var(--el-color-danger) !important;
        
        &:hover {
          background: rgba(245, 108, 108, 0.1) !important;
        }
      }
    }
  }
}

.tag-list,
.language-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.tag-item,
.language-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  cursor: pointer;
  transition: background-color $transition-base;
  position: relative;

  &:hover {
    background: var(--bg-tertiary);

    .tag-delete {
      opacity: 1;
    }
  }

  &.active {
    background: var(--bg-tertiary);
    color: var(--el-color-primary);
    font-weight: 500;
  }
}

.tag-color,
.language-dot {
  width: 12px;
  height: 12px;
  border-radius: $radius-round;
  flex-shrink: 0;
}

.tag-emoji {
  font-size: 1rem;
  line-height: 1;
  flex-shrink: 0;
  margin-right: 2px;
}

.tag-name,
.language-name {
  flex: 1;
  font-size: 0.875rem;
  color: var(--text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-count,
.language-count {
  margin-left: $spacing-xs;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  flex-shrink: 0;
  font-weight: 500;
}

.tag-delete {
  opacity: 0;
  transition: opacity $transition-base;
}

.empty-tags {
  padding: $spacing-md;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.875rem;
}

.clear-filter {
  margin-top: $spacing-sm;
  color: var(--text-tertiary);
  font-size: 0.875rem;
}
</style>
