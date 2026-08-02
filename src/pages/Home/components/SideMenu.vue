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
          <el-tooltip :content="isClassifying ? '分类进行中...' : 'AI 智能分类（仅未分类）'" placement="top">
            <el-button
              text
              circle
              size="small"
              :loading="isClassifying"
              :disabled="isClassifying"
              @click="handleAutoClassify(false)"
              class="classify-btn"
            >
              <el-icon v-if="!isClassifying"><MagicStick /></el-icon>
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
          <el-dropdown trigger="click" :disabled="isClassifying" @command="handleClassifyCommand">
            <el-button
              text
              circle
              size="small"
              :disabled="isClassifying"
              class="classify-dropdown-btn"
            >
              <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="incremental">
                  <el-icon><MagicStick /></el-icon>
                  {{ t('tag.classifyIncremental') }}
                </el-dropdown-item>
                <el-dropdown-item command="reclassify" divided>
                  <el-icon><Refresh /></el-icon>
                  {{ t('tag.classifyReclassify') }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTagStore } from '@/stores/tag'
import { useRepoStore } from '@/stores/repo'
import { getLanguageColor } from '@/utils/languageColors'
import { Plus, Close, Grid, Collection, Loading, MagicStick, ArrowDown, Refresh, CircleClose } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage, ElNotification } from 'element-plus'

const { t } = useI18n()

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

const handleClassifyCommand = (command: string) => {
  if (command === 'incremental') {
    handleAutoClassify(false)
  } else if (command === 'reclassify') {
    handleAutoClassifyWithConfirm()
  }
}

const handleAutoClassifyWithConfirm = async () => {
  try {
    await ElMessageBox.confirm(
      t('tag.reclassifyConfirm'),
      t('tag.reclassifyTitle'),
      {
        confirmButtonText: t('tag.reclassifyConfirmButton'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
    await handleAutoClassify(true)
  } catch (error) {
    // 用户取消
  }
}

// 停止分类
const handleStopClassifying = () => {
  shouldStopClassifying.value = true
  ElMessage.warning(t('tag.stopping'))
}

const handleAutoClassify = async (reclassifyAll = false) => {
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
  
  // 提示用户关于 OpenAI 速率限制
  const aiConfig = getAIConfig()
  if (aiConfig.provider === 'openai') {
    const batches = Math.ceil(repoStore.repos.length / 30)
    const minutes = Math.ceil(batches * 25 / 60)
    const confirm = await ElMessageBox.confirm(
      t('tag.openaiRateLimit', { 
        count: repoStore.repos.length, 
        batches, 
        minutes 
      }),
      t('tag.rateLimitTitle'),
      {
        confirmButtonText: t('tag.continueUsing'),
        cancelButtonText: t('tag.goToSwitch'),
        type: 'warning',
        distinguishCancelAndClose: true
      }
    ).catch(() => {
      window.location.hash = '#/settings'
      return false
    })
    
    if (!confirm) return
  }
  
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
  
  // 筛选需要分类的仓库（在获取 README 之前）
  let reposToClassify = repoStore.repos
  if (reclassifyAll) {
    // 显示清空进度
    const clearingMsg = ElMessage({
      message: '正在强力清空所有分类关联...',
      type: 'info',
      duration: 0
    })
    
    try {
      // 导入数据库
      const { db } = await import('@/db')
      
      // 确保数据库打开
      if (!db.isOpen()) {
        await db.open()
      }
      
      // 直接清空数据库中所有标签的 repos 字段
      const allTags = await db.tags.toArray()
      
      // 清空所有标签的 repos
      for (const tag of allTags) {
        await db.tags.update(tag.id, { repos: [], updatedAt: Date.now() })
    }
      
      // 清空 repoTags 表
      if (db.repoTags) {
        await db.repoTags.clear()
      }
      
      // 强制刷新 Store
    await tagStore.loadTags()
      
      // 等待一下确保同步
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 最终验证
      await tagStore.loadTags()
      const totalRepos = tagStore.tags.reduce((sum: number, tag: any) => sum + (tag.repos?.length || 0), 0)
      
      if (totalRepos > 0) {
        clearingMsg.close()
        
        // 提供详细的错误信息
        await ElMessageBox.alert(
          `清空失败！仍有 ${totalRepos} 个仓库关联。\n\n` +
          `这可能是数据库损坏导致的。\n\n` +
          `请使用以下方法之一：\n` +
          `1. 设置页面 → 清空所有数据\n` +
          `2. 右上角头像 → 重新抓取\n` +
          `3. 刷新页面后重试`,
          '清空失败',
          {
            confirmButtonText: '我知道了',
            type: 'error'
          }
        )
        return
      }
      
      clearingMsg.close()
      ElMessage.success('✓ 所有分类关联已彻底清空')
      
      // 等待 UI 更新
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      clearingMsg.close()
      console.error('清空标签关联失败:', error)
      ElMessage.error('清空失败: ' + (error instanceof Error ? error.message : String(error)))
      return
    }
    
    reposToClassify = repoStore.repos
  } else {
    // 只分类未分类的仓库
    const taggedRepoIds = new Set<number>()
    tagStore.tags.forEach((tag: any) => {
      if (tag.repos && Array.isArray(tag.repos)) {
        tag.repos.forEach((id: number) => taggedRepoIds.add(id))
      }
    })
    reposToClassify = repoStore.repos.filter((repo: any) => !taggedRepoIds.has(repo.id))
    
    if (reposToClassify.length === 0) {
      ElMessage.success(t('tag.allClassified'))
      return
    }
  }
  
  try {
    isClassifying.value = true
    shouldStopClassifying.value = false // 重置停止标志
    
    // 调用 AI 分类服务（带进度和批次结果回调）
    const { classifyRepositories, CATEGORY_COLORS } = await import('@/services/ai')
    const { githubApi } = await import('@/api/github')
    const { getAIConfig } = await import('@/config/ai')
    const { getCategoryPresets } = await import('@/config/categories')
    
    // 获取预设分类，用于匹配 emoji
    const presets = getCategoryPresets()
    const presetMap = new Map<string, { emoji?: string, color: string }>()
    presets.forEach(preset => {
      presetMap.set(preset.name, { emoji: preset.emoji, color: preset.color })
      if (preset.nameEn) {
        presetMap.set(preset.nameEn, { emoji: preset.emoji, color: preset.color })
      }
    })
    
    // 从配置中获取批次大小，默认 50
    const aiConfig = getAIConfig()
    const batchSize = aiConfig.batchSize || 50
    const totalRepos = reposToClassify.length
    const totalBatches = Math.ceil(totalRepos / batchSize)
    let totalClassified = 0
    const allCategoryMap = new Map<string, number[]>()
    
    // 创建固定的通知句柄
    classifyNotificationHandle.value = null
    
    // 逐批处理
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // 检查是否停止
      if (shouldStopClassifying.value) {
        if (classifyNotificationHandle.value) {
          classifyNotificationHandle.value.close()
          classifyNotificationHandle.value = null
        }
        ElNotification({
          title: t('tag.classifyStopped'),
          message: t('tag.classifyStoppedMessage', { count: totalClassified }),
          type: 'warning',
          duration: 3000
        })
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
            const response = await githubApi.getReadme(owner, repoName)
            reposWithReadme.push({
              ...repo,
              description: repo.description ?? null,
              readme: response.data
            } as any)
          } catch (e) {
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
          
          // 每批之间稍作延迟，避免请求过快
          if ((i + 1) % readmeBatchSize === 0 && i < batchRepos.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
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
      
      await classifyRepositories(
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
        // 批次完成回调（每批次完成后立即更新）
        async (innerBatchCategoryMap: Map<string, number[]>, innerBatchIndex: number, innerTotalBatches: number) => {
          // 立即更新这批次的分类
          for (const [categoryName, repoIds] of innerBatchCategoryMap.entries()) {
            if (repoIds.length === 0) continue
            
            // 移除分类名称中的描述部分和 emoji（如果有）
            let cleanCategoryName = categoryName.split(' - ')[0].trim()
            // 移除开头的 emoji（如果存在）
            cleanCategoryName = cleanCategoryName.replace(/^[\u{1F300}-\u{1F9FF}]+\s*/u, '').trim()
            
            // 从预设分类中查找对应的 emoji 和颜色
            const presetInfo = presetMap.get(cleanCategoryName) || presetMap.get(categoryName)
            const emoji = presetInfo?.emoji
            const color = presetInfo?.color || CATEGORY_COLORS[cleanCategoryName] || CATEGORY_COLORS[categoryName] || '#9e9e9e'
            
            // 检查分类是否已存在（精确匹配名称）
            const existingTag = tagStore.tags.find((t: any) => 
              t.name === cleanCategoryName || t.name === categoryName
            )
            
            if (existingTag) {
              // 更新现有分类（合并仓库 ID，更新 emoji 如果存在）
              const mergedRepoIds = Array.from(new Set([...(existingTag.repos || []), ...repoIds]))
              const updates: any = { repos: mergedRepoIds }
              if (emoji && existingTag.emoji !== emoji) {
                updates.emoji = emoji
              }
              await tagStore.updateTag(existingTag.id, updates)
            } else {
              // 创建新分类（包含 emoji）
              const newTag = await tagStore.createTag(cleanCategoryName, color, emoji)
              await tagStore.updateTag(newTag.id, {
                repos: repoIds
              })
            }
            
            // 合并到总分类映射
            if (!allCategoryMap.has(cleanCategoryName)) {
              allCategoryMap.set(cleanCategoryName, [])
            }
            allCategoryMap.get(cleanCategoryName)!.push(...repoIds)
            
            totalClassified += repoIds.length
          }
          
          // 重新加载分类以刷新 UI
          await tagStore.loadTags()
          
          // 更新总体进度通知
          if (classifyNotificationHandle.value) {
            classifyNotificationHandle.value.close()
          }
          const batchCompleteProgress = Math.round((totalClassified / totalRepos) * 100)
          classifyNotificationHandle.value = ElNotification({
            title: t('tag.classifying'),
            message: `${t('tag.overallProgress')}: ${totalClassified}/${totalRepos} (${batchCompleteProgress}%)\n` +
                     t('tag.innerBatchComplete', { 
                       batch: batchIndex + 1, 
                       innerCurrent: innerBatchIndex, 
                       innerTotal: innerTotalBatches 
                     }) + '\n' +
                     `${t('tag.classifiedRepos')}: ${totalClassified}`,
            type: 'info',
            duration: 0
          })
        },
        batchSize // 传递批次大小参数
      )
      
      // 注意：批次完成回调已经处理了所有分类的创建和更新
      // 这里的 batchCategoryMap 返回值实际上已经被处理过了
      // 不需要再次处理，否则会导致重复创建标签
      
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
    
    // 如果被停止，不显示成功消息
    if (!shouldStopClassifying.value) {
      // 强制刷新页面以显示更新
      repoStore.setCurrentPage(1)
      
      // 如果当前没有选中任何过滤，自动选中"全部仓库"
      if (!repoStore.selectedTag && repoStore.filterType !== 'all') {
        repoStore.setFilterType('all')
      }
      
      ElNotification({
        title: t('tag.classifySuccess'),
        message: t('tag.classifySuccessMessage', { 
          count: totalClassified, 
          categories: allCategoryMap.size 
        }),
        type: 'success',
        duration: 3000
      })
    }
  } catch (error: any) {
    console.error('Auto classify failed:', error)
    // 关闭进度通知
    if (classifyNotificationHandle.value) {
      classifyNotificationHandle.value.close()
      classifyNotificationHandle.value = null
    }
    ElMessage.error(error.message || t('tag.classifyFailed'))
  } finally {
    isClassifying.value = false
    shouldStopClassifying.value = false
  }
}

onMounted(() => {
  tagStore.loadTags()
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

