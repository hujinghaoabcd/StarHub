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
          <el-tooltip :content="isClassifying ? '分类进行中...' : 'AI 智能分类（仅未分类）'" placement="top">
            <el-button
              text
              circle
              size="small"
              :loading="isClassifying"
              :disabled="isClassifying || showClassificationReview"
              @click="handleAutoClassify"
              class="classify-btn"
            >
              <el-icon v-if="!isClassifying"><MagicStick /></el-icon>
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
          <el-tooltip content="停止分类" placement="top" v-if="isClassifying">
            <el-button
              text
              circle
              size="small"
              type="danger"
              @click="handleStopClassifying"
              class="stop-classify-btn"
            >
              <el-icon><CircleClose /></el-icon>
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
      :items="classificationReviewItems"
      :categories="classificationCategories"
      @confirm="handleClassificationReviewConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTagStore } from '@/stores/tag'
import { useRepoStore } from '@/stores/repo'
import { getLanguageColor } from '@/utils/languageColors'
import {
  ArrowDown,
  CircleClose,
  Close,
  Collection,
  Grid,
  Loading,
  MagicStick,
  Plus,
  RefreshLeft
} from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage, ElNotification } from 'element-plus'
import ClassificationReviewDialog from './ClassificationReviewDialog.vue'
import type {
  ClassificationAssignment,
  ClassificationCategory,
  ClassificationCommitReceipt,
  ClassificationReviewItem
} from '@/types'

const { t, locale } = useI18n()

const tagStore = useTagStore()
const repoStore = useRepoStore()

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
const isClassifying = ref(false)
const shouldStopClassifying = ref(false) // 停止分类标志
const classifyNotificationHandle = ref<any>(null) // 当前分类通知句柄
const showClassificationReview = ref(false)
const classificationReviewItems = ref<ClassificationReviewItem[]>([])
const classificationCategories = ref<ClassificationCategory[]>([])
const lastClassificationCommit = ref<ClassificationCommitReceipt | null>(null)
let classificationAbortController: AbortController | null = null

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

// 停止分类
const handleStopClassifying = () => {
  shouldStopClassifying.value = true
  classificationAbortController?.abort('user_cancelled')
  ElMessage.warning(t('tag.stopping'))
}

const handleAutoClassify = async () => {
  if (repoStore.repos.length === 0) {
    ElMessage.warning(t('tag.noReposToClassify'))
    return
  }

  // 检查是否配置了 AI
  const { isAIConfigured, getAIConfig } = await import('@/config/ai')
  if (!isAIConfigured()) {
    ElMessageBox.confirm(
      t('tag.needAIConfig'),
      t('tag.needAIConfigTitle'),
      {
        confirmButtonText: t('tag.goToConfig'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    ).then(() => {
      // 跳转到设置页面
      window.location.hash = '#/settings'
    }).catch(() => {
      // 用户取消
    })
    return
  }
  
  const aiConfig = getAIConfig()
  try {
    const { resolveAIEndpoint } = await import('@/utils/aiEndpoint')
    const endpoint = resolveAIEndpoint(aiConfig)
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
  } catch (error) {
    if (error instanceof Error && error.name === 'AIEndpointValidationError') {
      ElMessage.error(error.message)
    }
    return
  }

  const { getCategoryPresets } = await import('@/config/categories')
  const { buildClassificationRegistry } = await import(
    '@/services/classificationRegistry'
  )
  const registry = buildClassificationRegistry(
    tagStore.tags,
    getCategoryPresets(),
    locale.value
  )
  if (registry.length === 0) {
    ElMessage.warning(t('tag.reviewNoCategories'))
    return
  }
  classificationCategories.value = registry
  
  // 先询问是否包含 README（在开始分类之前）
  let includeReadme = false
  try {
    await ElMessageBox({
      title: t('tag.classifyOptions'),
      message: t('tag.includeReadme'),
      showCancelButton: true,
      confirmButtonText: t('tag.includeReadmeConfirm'),
      cancelButtonText: t('tag.basicInfoOnly'),
      distinguishCancelAndClose: false
    })
    includeReadme = true
  } catch {
    includeReadme = false
  }
  
  // 止损阶段只允许增量分类，绝不清空或覆盖已有分类关系。
  const taggedRepoIds = new Set<number>()
  tagStore.tags.forEach((tag: any) => {
    if (tag.repos && Array.isArray(tag.repos)) {
      tag.repos.forEach((id: number) => taggedRepoIds.add(id))
    }
  })
  const reposToClassify = repoStore.repos.filter((repo: any) => !taggedRepoIds.has(repo.id))

  if (reposToClassify.length === 0) {
    ElMessage.success(t('tag.allClassified'))
    return
  }

  let runStatus: 'success' | 'partial' | 'failed' | 'cancelled' = 'success'
  let failedRepoCount = 0
  let totalClassified = 0
  const successfulAssignments: ClassificationAssignment[] = []
  
  try {
    isClassifying.value = true
    shouldStopClassifying.value = false // 重置停止标志
    classificationAbortController = new AbortController()
    const classificationSignal = classificationAbortController.signal
    
    const { classifyRepositories } = await import('@/services/ai')
    const { githubApi } = await import('@/api/github')

    // 从配置中获取批次大小，默认 50
    const batchSize = aiConfig.batchSize || 50
    const totalRepos = reposToClassify.length
    const totalBatches = Math.ceil(totalRepos / batchSize)
    // 创建固定的通知句柄
    classifyNotificationHandle.value = null
    
    // 逐批处理
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // 检查是否停止
      if (shouldStopClassifying.value) {
        runStatus = 'cancelled'
        break
      }
      const start = batchIndex * batchSize
      const end = Math.min(start + batchSize, totalRepos)
      const batchRepos = reposToClassify.slice(start, end)
      
      // 更新进度通知（关闭旧的通知，创建新的）
      if (classifyNotificationHandle.value) {
        classifyNotificationHandle.value.close()
      }
      const progressPercent = Math.round((totalClassified / totalRepos) * 100)
      classifyNotificationHandle.value = ElNotification({
        title: t('tag.classifying'),
        message: `${t('tag.overallProgress')}: ${totalClassified}/${totalRepos} (${progressPercent}%)\n` +
                 t('tag.processingBatch', { 
                   current: batchIndex + 1, 
                   total: totalBatches, 
                   start: start + 1, 
                   end 
                 }),
        type: 'info',
        duration: 0
      })
      
      // 如果需要 README，先获取这批50个的 README
      let batchWithReadme = batchRepos
      if (includeReadme) {
        // 检查是否停止
        if (shouldStopClassifying.value) break
        
        if (classifyNotificationHandle.value) {
          classifyNotificationHandle.value.close()
        }
        const readmeProgressPercent = Math.round((totalClassified / totalRepos) * 100)
        classifyNotificationHandle.value = ElNotification({
          title: t('tag.preparingData'),
          message: `${t('tag.overallProgress')}: ${totalClassified}/${totalRepos} (${readmeProgressPercent}%)\n` +
                   t('tag.fetchingReadme', { 
                     batch: batchIndex + 1, 
                     count: batchRepos.length 
                   }),
          type: 'info',
          duration: 0
        })
        
        const reposWithReadme = []
        const readmeBatchSize = 10 // 每10个更新一次进度
        
        for (let i = 0; i < batchRepos.length; i++) {
          const repo = batchRepos[i]
          try {
            const [owner, repoName] = repo.full_name.split('/')
            const response = await githubApi.getReadme(
              owner,
              repoName,
              classificationSignal
            )
            reposWithReadme.push({
              ...repo,
              description: repo.description ?? null,
              readme: response.data
            } as any)
          } catch (e) {
            if (classificationSignal.aborted) {
              const abortError = new Error('Classification cancelled')
              abortError.name = 'AbortError'
              throw abortError
            }
            // README 不存在或获取失败，使用原仓库信息
            reposWithReadme.push({
              ...repo,
              description: repo.description ?? null
            } as any)
          }
          
          // 检查是否停止
          if (shouldStopClassifying.value) break
          
          // 每批更新一次进度
          if ((i + 1) % readmeBatchSize === 0 || i === batchRepos.length - 1) {
            if (classifyNotificationHandle.value) {
              classifyNotificationHandle.value.close()
            }
            const currentReadmeProgress = Math.round((totalClassified / totalRepos) * 100)
            const readmeFetchProgress = Math.round(((batchIndex * batchSize + i + 1) / totalRepos) * 100)
            classifyNotificationHandle.value = ElNotification({
              title: t('tag.preparingData'),
              message: `${t('tag.overallProgress')}: ${totalClassified}/${totalRepos} (${currentReadmeProgress}%)\n` +
                       `${t('tag.readmeFetched')}: ${batchIndex * batchSize + i + 1}/${totalRepos} (${readmeFetchProgress}%)\n` +
                       `${t('tag.batchProgress', { batch: batchIndex + 1 })}: ${i + 1}/${batchRepos.length}`,
              type: 'info',
              duration: 0
            })
          }
          
        }
        
        batchWithReadme = reposWithReadme
      }
      
      // 检查是否停止
      if (shouldStopClassifying.value) break
      
      // 立即对这50个进行分类
      if (classifyNotificationHandle.value) {
        classifyNotificationHandle.value.close()
      }
      const classifyProgressPercent = Math.round((totalClassified / totalRepos) * 100)
      classifyNotificationHandle.value = ElNotification({
        title: t('tag.classifying'),
        message: `${t('tag.overallProgress')}: ${totalClassified}/${totalRepos} (${classifyProgressPercent}%)\n` +
                 t('tag.classifyingBatch', { 
                   current: batchIndex + 1, 
                   total: totalBatches, 
                   start: start + 1, 
                   end 
                 }),
        type: 'info',
        duration: 0
      })
      
      const classificationResult = await classifyRepositories(
        batchWithReadme as any,
        // 进度回调
        (current, total) => {
          // 检查是否停止
          if (shouldStopClassifying.value) return
          
          if (classifyNotificationHandle.value) {
            classifyNotificationHandle.value.close()
          }
          const currentOverallProgress = Math.round((totalClassified / totalRepos) * 100)
          const currentBatchProgress = Math.round((current / total) * 100)
          classifyNotificationHandle.value = ElNotification({
            title: t('tag.classifying'),
            message: `${t('tag.overallProgress')}: ${totalClassified}/${totalRepos} (${currentOverallProgress}%)\n` +
                     `${t('tag.batchInnerProgress', { batch: batchIndex + 1 })}: ${current}/${total} (${currentBatchProgress}%)\n` +
                     `${t('tag.classifiedRepos')}: ${totalClassified}`,
            type: 'info',
            duration: 0
          })
        },
        batchSize,
        {
          categories: classificationCategories.value,
          signal: classificationSignal,
          requestTimeoutMs: 60_000
        }
      )

      if (classificationResult.status === 'cancelled') {
        runStatus = 'cancelled'
        break
      }

      successfulAssignments.push(...classificationResult.assignments)
      totalClassified += classificationResult.assignments.length

      if (
        classificationResult.status === 'failed' ||
        classificationResult.status === 'partial'
      ) {
        const failedIds = new Set(
          classificationResult.failures.flatMap(failure => failure.repositoryIds)
        )
        failedRepoCount += failedIds.size
        runStatus = totalClassified > 0 ? 'partial' : 'failed'
        continue
      }
      if (runStatus === 'failed') runStatus = 'partial'

      // 批次完成后更新总体进度
      if (classifyNotificationHandle.value) {
        classifyNotificationHandle.value.close()
      }
      const finalBatchProgress = Math.round((totalClassified / totalRepos) * 100)
      classifyNotificationHandle.value = ElNotification({
        title: t('tag.classifying'),
        message: `${t('tag.overallProgress')}: ${totalClassified}/${totalRepos} (${finalBatchProgress}%)\n` +
                 t('tag.batchComplete', { 
                   current: batchIndex + 1, 
                   total: totalBatches 
                 }) + '\n' +
                 `${t('tag.classifiedRepos')}: ${totalClassified}`,
        type: 'info',
        duration: 0
      })
    }
    
    // 关闭进度通知
    if (classifyNotificationHandle.value) {
      classifyNotificationHandle.value.close()
      classifyNotificationHandle.value = null
    }
    
    if (classificationSignal.aborted || shouldStopClassifying.value) {
      runStatus = 'cancelled'
    }

    if (runStatus === 'cancelled') {
      ElNotification({
        title: t('tag.classifyStopped'),
        message: t('tag.classifyStoppedMessage', { count: totalClassified }),
        type: 'warning',
        duration: 4000
      })
    } else if (successfulAssignments.length > 0) {
      const repositoriesById = new Map(
        reposToClassify.map(repository => [repository.id, repository])
      )
      const categoriesById = new Map(
        classificationCategories.value.map(category => [
          category.categoryId,
          category
        ])
      )
      classificationReviewItems.value = successfulAssignments.flatMap(
        assignment => {
          const repository = repositoriesById.get(assignment.repositoryId)
          const category = categoriesById.get(assignment.categoryId)
          if (!repository || !category) return []
          return [{
            ...assignment,
            repositoryName: repository.full_name,
            categoryName: category.name
          }]
        }
      )
      showClassificationReview.value = true

      ElNotification({
        title: t('tag.reviewTitle'),
        message: t('tag.reviewReady', {
          success: totalClassified,
          failed: failedRepoCount
        }),
        type: runStatus === 'partial' ? 'warning' : 'success',
        duration: 6000
      })
    } else {
      ElNotification({
        title: t('tag.classifyFailed'),
        message: t('tag.classifyPartialMessage', {
          success: 0,
          failed: failedRepoCount || reposToClassify.length
        }),
        type: 'error',
        duration: 6000
      })
    }
  } catch (error: any) {
    console.error('Auto classify failed:', error)
    // 关闭进度通知
    if (classifyNotificationHandle.value) {
      classifyNotificationHandle.value.close()
      classifyNotificationHandle.value = null
    }
    if (error?.name === 'AbortError' || classificationAbortController?.signal.aborted) {
      ElNotification({
        title: t('tag.classifyStopped'),
        message: t('tag.classifyStoppedMessage', { count: totalClassified }),
        type: 'warning',
        duration: 4000
      })
    } else {
      ElMessage.error(error.message || t('tag.classifyFailed'))
    }
  } finally {
    isClassifying.value = false
    shouldStopClassifying.value = false
    classificationAbortController = null
  }
}

const handleClassificationReviewConfirm = async (
  assignments: ClassificationAssignment[]
) => {
  try {
    const receipt = await tagStore.applyClassificationAssignments(assignments)
    classificationReviewItems.value = []
    lastClassificationCommit.value = receipt.addedRelations.length > 0
      ? receipt
      : null
    repoStore.setCurrentPage(1)
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
    showClassificationReview.value = true
    ElMessage.error(error instanceof Error ? error.message : String(error))
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
  tagStore.loadTags()
})

onUnmounted(() => {
  classificationAbortController?.abort('component_unmounted')
  classificationAbortController = null
  classifyNotificationHandle.value?.close()
  classifyNotificationHandle.value = null
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
