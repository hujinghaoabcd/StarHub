<template>
  <div class="settings-page">
    <div class="settings-header">
      <h1>{{ t('menu.settings') }}</h1>
    </div>

    <div class="settings-content">
      <el-card class="settings-card">
        <template #header>
          <div class="card-header">
            <span>{{ t('settings.presetCategories') }}</span>
            <div style="display: flex; gap: 8px;">
              <el-button text @click="handleSyncToTags">{{ t('settings.syncToTags') }}</el-button>
              <el-button text @click="handleResetPresets">{{ t('settings.resetToDefault') }}</el-button>
            </div>
          </div>
        </template>

        <div class="presets-section">
          <el-button type="primary" @click="showAddPresetDialog = true" style="margin-bottom: 16px;">
            <el-icon><Plus /></el-icon>
            {{ t('settings.addPresetCategory') }}
          </el-button>

          <el-table :data="categoryPresets" style="width: 100%" class="presets-table">
            <el-table-column :label="t('settings.categoryName')" width="200">
              <template #default="scope">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span v-if="scope.row.emoji" style="font-size: 1.2rem;">{{ scope.row.emoji }}</span>
                  <div>
                    <div>{{ scope.row.name }}</div>
                    <div v-if="scope.row.nameEn" style="font-size: 0.75rem; color: var(--text-tertiary);">{{ scope.row.nameEn }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column :label="t('settings.description')" min-width="200">
              <template #default="scope">
                <div>
                  <div>{{ scope.row.description }}</div>
                  <div v-if="scope.row.descriptionEn" style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 4px;">{{ scope.row.descriptionEn }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="color" :label="t('settings.color')" width="100">
              <template #default="scope">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div :style="{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: scope.row.color }"></div>
                  <span>{{ scope.row.color }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column :label="t('common.actions')" width="150">
              <template #default="scope">
                <el-button text size="small" @click="handleEditPreset(scope.row)">{{ t('common.edit') }}</el-button>
                <el-button text size="small" type="danger" @click="handleDeletePreset(scope.row.name)">{{ t('common.delete') }}</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>

      <el-card class="settings-card" style="margin-top: 20px;">
        <template #header>
          <div class="card-header">
            <span>{{ t('settings.aiClassification') }}</span>
          </div>
        </template>

        <el-form :model="aiConfig" label-width="120px" label-position="left">
          <el-form-item :label="t('settings.aiPlatform')">
            <el-select v-model="aiConfig.provider" :placeholder="t('settings.selectAIPlatform')" @change="handleProviderChange">
              <el-option :label="t('settings.openaiGuide')" value="openai" />
              <el-option :label="t('settings.claudeGuide')" value="claude" />
              <el-option :label="t('settings.qwenGuide')" value="qwen" />
              <el-option :label="t('settings.zhipuGuide')" value="zhipu" />
              <el-option :label="t('settings.deepseekGuide')" value="deepseek" />
            </el-select>
          </el-form-item>

          <el-form-item :label="t('settings.apiKey')">
            <el-input
              v-model="aiConfig.apiKey"
              type="password"
              show-password
              :placeholder="t('settings.enterAPIKey')"
            />
          </el-form-item>

          <el-form-item :label="t('settings.apiAddress')">
            <el-input
              v-model="aiConfig.baseURL"
              :placeholder="getDefaultBaseURL()"
            >
              <template #append>
                <el-button @click="resetBaseURL">{{ t('common.reset') }}</el-button>
              </template>
            </el-input>
            <div class="form-tip">{{ t('settings.emptyForDefault') }}</div>
          </el-form-item>

          <el-form-item :label="t('settings.model')">
            <el-input
              v-model="aiConfig.model"
              :placeholder="getDefaultModel()"
            >
              <template #append>
                <el-button @click="resetModel">{{ t('common.reset') }}</el-button>
              </template>
            </el-input>
            <div class="form-tip">{{ t('settings.emptyForDefaultModel') }}</div>
          </el-form-item>

          <el-form-item :label="t('settings.batchSize')">
            <el-input-number
              v-model="aiConfig.batchSize"
              :min="1"
              :max="100"
              :step="10"
              :placeholder="50"
            />
            <div class="form-tip">{{ t('settings.batchSizeTip') }}</div>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSave">
              {{ t('common.save') }}
            </el-button>
            <el-button @click="handleTest" :loading="testing">
              {{ t('settings.testConnection') }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="settings-card" style="margin-top: 20px;">
        <template #header>
          <div class="card-header">
            <span>{{ t('settings.dataManagement') }}</span>
          </div>
        </template>

        <div class="data-management">
          <el-alert
            :title="t('settings.dataBackup')"
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 20px;"
          >
            {{ t('settings.dataBackupDesc') }}
          </el-alert>

          <div class="data-actions">
            <el-button type="primary" @click="handleExport" :loading="exporting" size="default">
              <el-icon><Download /></el-icon>
              {{ t('settings.exportData') }}
            </el-button>
            <el-button @click="handleImport" :loading="importing" size="default">
              <el-icon><Upload /></el-icon>
              {{ t('settings.importData') }}
            </el-button>
            <el-button type="danger" @click="handleClearAll" plain size="default">
              <el-icon><Delete /></el-icon>
              {{ t('settings.clearAllData') }}
            </el-button>
            <el-button @click="handleCheckDatabase" size="small" text>
              <el-icon><View /></el-icon>
              检查数据库
            </el-button>
          </div>

          <el-alert
            v-if="repoStore.isSyncing"
            title="正在同步数据"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 16px;"
          >
            正在从 GitHub 同步数据 ({{ repoStore.syncProgress.count }} 个仓库)。清空数据前会先停止同步。
          </el-alert>

          <div class="data-stats" v-if="dataStats">
            <div class="stats-grid">
              <div class="stat-card" :key="`repos-${dataStats.repos}`">
                <div class="stat-label">{{ t('settings.repoCount') }}</div>
                <div class="stat-value" :class="{ 'is-zero': dataStats.repos === 0 }">{{ dataStats.repos }}</div>
              </div>
              <div class="stat-card" :key="`tags-${dataStats.tags}`">
                <div class="stat-label">{{ t('settings.tagCount') }}</div>
                <div class="stat-value" :class="{ 'is-zero': dataStats.tags === 0 }">{{ dataStats.tags }}</div>
              </div>
              <div class="stat-card" :key="`tagged-${dataStats.taggedRepos}`">
                <div class="stat-label">{{ t('settings.taggedRepos') }}</div>
                <div class="stat-value" :class="{ 'is-zero': dataStats.taggedRepos === 0 }">{{ dataStats.taggedRepos }}</div>
              </div>
              <div class="stat-card" :key="`untagged-${dataStats.untaggedRepos}`">
                <div class="stat-label">{{ t('settings.untaggedRepos') }}</div>
                <div class="stat-value" :class="{ 'is-zero': dataStats.untaggedRepos === 0 }">{{ dataStats.untaggedRepos }}</div>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="settings-card" style="margin-top: 20px;">
        <template #header>
          <div class="card-header">
            <span>{{ t('settings.apiGuide') }}</span>
          </div>
        </template>

        <div class="api-guide">
          <el-collapse accordion>
            <el-collapse-item :title="t('settings.openaiGuide')" name="openai">
              <ol>
                <li>{{ t('settings.visitLink') }} <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI API Keys</a></li>
                <li>{{ t('settings.loginAndCreate') }} "Create new secret key"</li>
                <li>{{ t('settings.copyKey') }} {{ t('common.and') }} {{ t('settings.pasteAbove') }}</li>
                <li>{{ t('settings.recommendedModel') }}: gpt-4o-mini（{{ t('settings.lowCostFast') }}）</li>
              </ol>
            </el-collapse-item>

            <el-collapse-item :title="t('settings.claudeGuide')" name="claude">
              <ol>
                <li>{{ t('settings.visitLink') }} <a href="https://console.anthropic.com/settings/keys" target="_blank">Claude API Keys</a></li>
                <li>{{ t('settings.loginAndCreate') }} {{ t('settings.newAPIKey') }}</li>
                <li>{{ t('settings.copyKey') }}</li>
                <li>{{ t('settings.recommendedModel') }}: claude-3-5-sonnet-20241022</li>
              </ol>
            </el-collapse-item>

            <el-collapse-item :title="t('settings.qwenGuide')" name="qwen">
              <ol>
                <li>{{ t('settings.visitLink') }} <a href="https://dashscope.aliyun.com/" target="_blank">{{ t('settings.aliyunBailian') }}</a></li>
                <li>{{ t('settings.loginAndGoTo') }} "API-KEY 管理"</li>
                <li>{{ t('settings.createAndCopy') }} API Key</li>
                <li>{{ t('settings.recommendedModel') }}: qwen-plus {{ t('common.or') }} qwen-turbo</li>
              </ol>
            </el-collapse-item>

            <el-collapse-item :title="t('settings.zhipuGuide')" name="zhipu">
              <ol>
                <li>{{ t('settings.visitLink') }} <a href="https://open.bigmodel.cn/" target="_blank">{{ t('settings.zhipuPlatform') }}</a></li>
                <li>{{ t('settings.loginAndGoTo') }} "API 密钥"</li>
                <li>{{ t('settings.createAndCopy') }} API Key</li>
                <li>{{ t('settings.recommendedModel') }}: glm-4-flash（{{ t('settings.free') }}）</li>
              </ol>
            </el-collapse-item>

            <el-collapse-item :title="t('settings.deepseekGuide')" name="deepseek">
              <ol>
                <li>{{ t('settings.visitLink') }} <a href="https://platform.deepseek.com/api_keys" target="_blank">DeepSeek Platform</a></li>
                <li>{{ t('settings.loginAndCreate') }} API Key</li>
                <li>{{ t('settings.copyKey') }}</li>
                <li>{{ t('settings.recommendedModel') }}: deepseek-chat（{{ t('settings.costEffective') }}）</li>
              </ol>
            </el-collapse-item>
          </el-collapse>
        </div>
      </el-card>
    </div>

    <!-- 添加/编辑预设分类对话框 -->
    <el-dialog
      v-model="showAddPresetDialog"
      :title="editingPreset ? t('settings.editPresetCategory') : t('settings.addPresetCategory')"
      width="500px"
    >
      <el-form :model="newPreset" label-width="100px">
        <el-form-item :label="t('tag.emoji')">
          <el-input 
            v-model="newPreset.emoji" 
            :placeholder="t('tag.emojiPlaceholder')"
            maxlength="2"
            style="width: 120px;"
          />
          <div class="form-tip">{{ t('tag.emojiTip') }}</div>
        </el-form-item>
        <el-form-item :label="t('settings.categoryName') + ' (中文)'">
          <el-input v-model="newPreset.name" :placeholder="t('settings.categoryNamePlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('settings.categoryName') + ' (English)'">
          <el-input v-model="newPreset.nameEn" :placeholder="t('settings.categoryNameEnPlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('settings.description') + ' (中文)'">
          <el-input v-model="newPreset.description" :placeholder="t('settings.descriptionPlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('settings.description') + ' (English)'">
          <el-input v-model="newPreset.descriptionEn" :placeholder="t('settings.descriptionEnPlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('settings.color')">
          <el-color-picker v-model="newPreset.color" />
        </el-form-item>
        <el-form-item :label="t('settings.keywords')">
          <el-input
            v-model="newPreset.keywordsStr"
            type="textarea"
            :rows="3"
            :placeholder="t('settings.keywordsPlaceholder')"
          />
          <div class="form-tip">{{ t('settings.keywordsTip') }}</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddPresetDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleSavePreset">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, Upload, Delete, View } from '@element-plus/icons-vue'
import { getAIConfig, saveAIConfig, DEFAULT_MODELS, DEFAULT_BASE_URLS, type AIConfig } from '@/config/ai'
import {
  getCategoryPresets,
  saveCategoryPresets,
  resetCategoryPresets,
  type CategoryPreset
} from '@/config/categories'
import { useTagStore } from '@/stores/tag'
import { useRepoStore } from '@/stores/repo'
import { db } from '@/db'
import type { Repository, Tag } from '@/types'
import {
  buildRepoTagsFromTags,
  toStoredTag
} from '@/services/tagRelations'
import { runDataMutation } from '@/services/dataMutationQueue'
import Dexie from 'dexie'

const { t } = useI18n()
const router = useRouter()
const tagStore = useTagStore()
const repoStore = useRepoStore()

const aiConfig = ref<AIConfig>({
  provider: 'openai',
  apiKey: '',
  baseURL: '',
  model: '',
  batchSize: 50
})

const testing = ref(false)
const exporting = ref(false)
const importing = ref(false)
const dataStats = ref<{
  repos: number
  tags: number
  taggedRepos: number
  untaggedRepos: number
} | null>(null)

// 预设分类管理
const categoryPresets = ref<CategoryPreset[]>([])
const showAddPresetDialog = ref(false)
const editingPreset = ref<string | null>(null)
const newPreset = ref({
  name: '',
  nameEn: '',
  emoji: '',
  description: '',
  descriptionEn: '',
  color: '#409EFF',
  keywordsStr: ''
})

onMounted(async () => {
  aiConfig.value = getAIConfig()
  categoryPresets.value = getCategoryPresets()
  
  // 确保 tagStore 已加载
  if (tagStore.tags.length === 0) {
    await tagStore.loadTags()
  }
  
  // 加载数据统计
  await loadDataStats()
})

// 当页面被激活时（从其他页面返回），重新加载数据统计
onActivated(async () => {
  await loadDataStats()
})

// 监听 repos 和 tags 的变化，自动更新统计
watch(
  () => [repoStore.repos.length, tagStore.tags.length],
  async () => {
    await loadDataStats()
  },
  { deep: true }
)

// 加载数据统计
const loadDataStats = async () => {
  try {
    // Ensure database is open
    if (!db.isOpen()) {
      await db.open()
    }
    
    const [repos, tags, relations] = await Promise.all([
      db.repos.toArray(),
      db.tags.toArray(),
      db.repoTags.toArray()
    ])
    const taggedRepoIds = new Set(relations.map(relation => relation.repoId))
    
    dataStats.value = {
      repos: repos.length,
      tags: tags.length,
      taggedRepos: taggedRepoIds.size,
      untaggedRepos: repos.length - taggedRepoIds.size
    }
  } catch (error) {
    console.error('Failed to load data stats:', error)
    // Set to 0 if unable to load
    dataStats.value = {
      repos: 0,
      tags: 0,
      taggedRepos: 0,
      untaggedRepos: 0
    }
  }
}

// 同步预设分类到实际分类
const syncPresetsToTags = async () => {
  // 确保 tagStore 已加载
  if (tagStore.tags.length === 0) {
    await tagStore.loadTags()
  }
  
  let syncCount = 0
  for (const preset of categoryPresets.value) {
    // 再次检查是否已存在（防止重复）
    const existingTag = tagStore.tags.find(t => t.name === preset.name)
    if (!existingTag) {
      await tagStore.createTag(preset.name, preset.color, preset.emoji)
      syncCount++
    } else {
      const updates: any = {}
      if (existingTag.color !== preset.color) {
        updates.color = preset.color
      }
      if (existingTag.emoji !== preset.emoji) {
        updates.emoji = preset.emoji
      }
      if (Object.keys(updates).length > 0) {
        await tagStore.updateTag(existingTag.id, updates)
        syncCount++
      }
    }
  }
  return syncCount
}

const handleSyncToTags = async () => {
  const loading = ElMessage({
    message: t('settings.syncingCategories'),
    type: 'info',
    duration: 0
  })
  
  try {
    const count = await syncPresetsToTags()
    loading.close()
    if (count > 0) {
      ElMessage.success(t('settings.syncSuccess', { count }))
    } else {
      ElMessage.info(t('settings.syncNoChange'))
    }
  } catch (error) {
    loading.close()
    ElMessage.error(t('settings.syncFailed'))
    console.error('Sync failed:', error)
  }
}

const handleResetPresets = async () => {
  try {
    await ElMessageBox.confirm(
      t('settings.resetPresetsConfirm'),
      t('settings.resetPresetsTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
    resetCategoryPresets()
    categoryPresets.value = getCategoryPresets()
    
    // 同步创建默认预设对应的实际分类（如果不存在）
    for (const preset of categoryPresets.value) {
      const existingTag = tagStore.tags.find(t => t.name === preset.name)
      if (!existingTag) {
        await tagStore.createTag(preset.name, preset.color, preset.emoji)
      } else {
        const updates: any = {}
        if (existingTag.emoji !== preset.emoji) {
          updates.emoji = preset.emoji
        }
        if (existingTag.color !== preset.color) {
          updates.color = preset.color
        }
        if (Object.keys(updates).length > 0) {
          await tagStore.updateTag(existingTag.id, updates)
        }
      }
    }
    
    ElMessage.success(t('settings.resetPresetsSuccess'))
  } catch {
    // 用户取消
  }
}

const handleEditPreset = (preset: CategoryPreset) => {
  editingPreset.value = preset.name
  newPreset.value = {
    name: preset.name,
    nameEn: preset.nameEn || '',
    emoji: preset.emoji || '',
    description: preset.description,
    descriptionEn: preset.descriptionEn || '',
    color: preset.color,
    keywordsStr: preset.keywords.join(', ')
  }
  showAddPresetDialog.value = true
}

const handleDeletePreset = async (name: string) => {
  try {
    // 检查是否有实际分类在使用
    const existingTag = tagStore.tags.find(t => t.name === name)
    const hasRepos = existingTag && existingTag.repos && existingTag.repos.length > 0
    
    let confirmMessage = ''
    if (hasRepos) {
      confirmMessage = t('settings.deletePresetConfirmWithRepos', { name, count: existingTag.repos.length })
    } else if (existingTag) {
      confirmMessage = t('settings.deletePresetConfirmWithTag', { name })
    } else {
      confirmMessage = t('settings.deletePresetConfirm', { name })
    }
    
    await ElMessageBox.confirm(
      confirmMessage,
      t('settings.deletePresetTitle'),
      {
        confirmButtonText: t('settings.deletePresetButton'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
    
    // 删除预设
    const presets = categoryPresets.value.filter(p => p.name !== name)
    saveCategoryPresets(presets)
    categoryPresets.value = presets
    
    // 如果存在对应的实际分类且未被使用，则一并删除
    if (existingTag && !hasRepos) {
      await tagStore.deleteTag(existingTag.id)
    }
    
    ElMessage.success(t('settings.deletePresetSuccess'))
  } catch {
    // 用户取消
  }
}

const handleSavePreset = async () => {
  if (!newPreset.value.name.trim()) {
    ElMessage.warning(t('settings.categoryNameRequired'))
    return
  }

  const preset: CategoryPreset = {
    name: newPreset.value.name.trim(),
    nameEn: newPreset.value.nameEn.trim() || newPreset.value.name.trim(),
    emoji: newPreset.value.emoji.trim() || '',
    description: newPreset.value.description.trim(),
    descriptionEn: newPreset.value.descriptionEn.trim() || newPreset.value.description.trim(),
    color: newPreset.value.color,
    keywords: newPreset.value.keywordsStr
      .split(',')
      .map(k => k.trim())
      .filter(k => k)
  }

  const presets = categoryPresets.value
  const isEditing = !!editingPreset.value

  if (isEditing) {
    // 编辑模式
    const index = presets.findIndex(p => p.name === editingPreset.value)
    if (index !== -1) {
      presets[index] = preset
      
      // 同步更新实际分类
      await tagStore.loadTags() // 确保最新数据
      const existingTag = tagStore.tags.find(t => t.name === editingPreset.value)
      if (existingTag) {
        await tagStore.updateTag(existingTag.id, {
          name: preset.name,
          color: preset.color,
          emoji: preset.emoji
        })
      }
    }
  } else {
    // 新增模式 - 检查预设是否已存在
    if (presets.some(p => p.name === preset.name)) {
      ElMessage.warning(t('settings.categoryNameExists'))
      return
    }
    presets.push(preset)
    
    // 同步创建实际分类（确保不重复）
    await tagStore.loadTags() // 确保最新数据
    const existingTag = tagStore.tags.find(t => t.name === preset.name)
    if (!existingTag) {
      await tagStore.createTag(preset.name, preset.color, preset.emoji)
    }
  }

  saveCategoryPresets(presets)
  categoryPresets.value = [...presets]
  showAddPresetDialog.value = false
  editingPreset.value = null
  newPreset.value = {
    name: '',
    nameEn: '',
    emoji: '',
    description: '',
    descriptionEn: '',
    color: '#409EFF',
    keywordsStr: ''
  }
  ElMessage.success(isEditing ? '更新成功' : '添加成功')
}

const handleProviderChange = () => {
  // 当切换平台时，清空自定义配置，使用默认值
  aiConfig.value.baseURL = ''
  aiConfig.value.model = ''
}

const getDefaultBaseURL = () => {
  return DEFAULT_BASE_URLS[aiConfig.value.provider]
}

const getDefaultModel = () => {
  return DEFAULT_MODELS[aiConfig.value.provider]
}

const resetBaseURL = () => {
  aiConfig.value.baseURL = ''
}

const resetModel = () => {
  aiConfig.value.model = ''
}

const handleSave = () => {
  if (!aiConfig.value.apiKey) {
    ElMessage.warning('请输入 API Key')
    return
  }

  saveAIConfig(aiConfig.value)
  ElMessage.success('设置已保存')
}

const handleTest = async () => {
  if (!aiConfig.value.apiKey) {
    ElMessage.warning('请先输入 API Key')
    return
  }

  testing.value = true

  try {
    const baseURL = aiConfig.value.baseURL || DEFAULT_BASE_URLS[aiConfig.value.provider]
    const model = aiConfig.value.model || DEFAULT_MODELS[aiConfig.value.provider]

    let response: Response

    if (aiConfig.value.provider === 'claude') {
      response = await fetch(`${baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': aiConfig.value.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      })
    } else {
      response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.value.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10
        })
      })
    }

    if (response.ok) {
      ElMessage.success('连接成功！')
    } else {
      const error = await response.text()
      throw new Error(error)
    }
  } catch (error: any) {
    console.error('Test failed:', error)
    ElMessage.error(`连接失败: ${error.message}`)
  } finally {
    testing.value = false
  }
}

// 导出数据
const handleExport = async () => {
  try {
    exporting.value = true
    
    // Collect a portable snapshot. Tag membership is hydrated from repoTags.
    await tagStore.loadTags()
    const repos = await db.repos.toArray()
    const tags = tagStore.tags.map(tag => ({
      ...tag,
      repos: [...tag.repos]
    }))
    
    const exportData = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      data: {
        repos,
        tags,
        categoryPresets: getCategoryPresets()
      },
      stats: dataStats.value
    }
    
    // 生成文件名
    const filename = `starhub-backup-${new Date().toISOString().split('T')[0]}.json`
    
    // 创建下载链接
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success(`数据已导出到 ${filename}`)
  } catch (error) {
    console.error('Export failed:', error)
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

// 导入数据
const handleImport = () => {
  // 创建文件输入元素
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    
    try {
      importing.value = true
      
      // 读取文件
      const text = await file.text()
      const importData = JSON.parse(text)
      
      // 验证数据格式
      if (!importData.version || !importData.data) {
        throw new Error('Invalid backup file format')
      }
      
      // 确认导入
      await ElMessageBox.confirm(
        `即将导入数据：\n` +
        `- 仓库：${importData.data.repos?.length || 0} 个\n` +
        `- 分类：${importData.data.tags?.length || 0} 个\n` +
        `- 导出日期：${importData.exportDate}\n\n` +
        `⚠️ 此操作将覆盖当前所有数据，是否继续？`,
        '确认导入',
        {
          confirmButtonText: '确认导入',
          cancelButtonText: '取消',
          type: 'warning',
          confirmButtonClass: 'el-button--danger'
        }
      )
      
      const now = Date.now()
      const importedRepos: Repository[] = Array.isArray(importData.data.repos)
        ? importData.data.repos
        : []
      const importedTags: Tag[] = Array.isArray(importData.data.tags)
        ? importData.data.tags.map((tag: Partial<Tag>) => ({
            id: String(tag.id || ''),
            name: String(tag.name || ''),
            color: String(tag.color || '#409EFF'),
            emoji: tag.emoji,
            repos: Array.isArray(tag.repos)
              ? Array.from(new Set(tag.repos.filter(Number.isFinite)))
              : [],
            createdAt: Number(tag.createdAt) || now,
            updatedAt: Number(tag.updatedAt) || now
          })).filter((tag: Tag) => tag.id && tag.name)
        : []
      const storedTags = importedTags.map(toStoredTag)
      const relations = buildRepoTagsFromTags(importedTags)

      await runDataMutation(() =>
        db.transaction(
          'rw',
          db.repos,
          db.tags,
          db.repoTags,
          async () => {
            await db.repos.clear()
            await db.tags.clear()
            await db.repoTags.clear()

            if (importedRepos.length > 0) {
              await db.repos.bulkAdd(importedRepos)
            }
            if (storedTags.length > 0) {
              await db.tags.bulkAdd(storedTags)
            }
            if (relations.length > 0) {
              await db.repoTags.bulkAdd(relations)
            }
          }
        )
      )
      
      // 恢复预设分类
      if (importData.data.categoryPresets) {
        saveCategoryPresets(importData.data.categoryPresets)
        categoryPresets.value = importData.data.categoryPresets
      }
      
      // 重新加载数据
      await tagStore.loadTags()
      await repoStore.loadRepos()
      await loadDataStats()
      
      ElMessage.success('数据导入成功！')
      
      // 自动返回主页
      setTimeout(() => {
        ElMessage({
          message: '数据已导入，正在返回主页...',
          type: 'success',
          duration: 1500
        })
        
        // Navigate to home page and reload
        setTimeout(() => {
          router.push('/').then(() => {
            window.location.reload()
          })
        }, 800)
      }, 500)
      
    } catch (error: any) {
      if (error !== 'cancel') {
        console.error('Import failed:', error)
        ElMessage.error(`导入失败: ${error.message || '未知错误'}`)
      }
    } finally {
      importing.value = false
    }
  }
  
  input.click()
}

// 检查数据库状态
const handleCheckDatabase = async () => {
  try {
    const repoCount = await db.repos.count()
    const tagCount = await db.tags.count()
    const repoTagCount = db.repoTags ? await db.repoTags.count() : 0
    const isOpen = db.isOpen()
    
    await ElMessageBox.alert(
      `数据库状态:\n\n` +
      `- 数据库状态: ${isOpen ? '已打开' : '已关闭'}\n` +
      `- 数据库中的仓库: ${repoCount} 个\n` +
      `- 数据库中的标签: ${tagCount} 个\n` +
      `- 数据库中的关联: ${repoTagCount} 个\n` +
      `- Store 中的仓库: ${repoStore.repos.length} 个\n` +
      `- Store 中的标签: ${tagStore.tags.length} 个`,
      '数据库状态',
      {
        confirmButtonText: '关闭',
        type: 'info'
      }
    )
  } catch (error) {
    console.error('检查数据库失败:', error)
    ElMessage.error('检查数据库失败')
  }
}

// 清空所有数据 - 彻底清空版本
const handleClearAll = async () => {
  try {
    // Check if syncing
    const isSyncing = repoStore.isSyncing
    let confirmMessage = '⚠️ 此操作将清空所有数据，包括：\n' +
      `- ${dataStats.value?.repos || 0} 个仓库\n` +
      `- ${dataStats.value?.tags || 0} 个分类\n` +
      `- 所有分类关联关系\n\n`
    
    if (isSyncing) {
      confirmMessage += '⚠️ 检测到正在进行同步操作！\n' +
                       '清空数据前会先停止同步。\n\n'
    }
    
    confirmMessage += '建议先导出数据进行备份。\n\n' +
                     '此操作不可恢复，是否继续？'
    
    await ElMessageBox.confirm(
      confirmMessage,
      '确认清空所有数据',
      {
        confirmButtonText: '确认清空',
        cancelButtonText: '取消',
        type: 'error',
        confirmButtonClass: 'el-button--danger'
      }
    )
    
    let loading = ElMessage({
      message: '正在清空数据...',
      type: 'info',
      duration: 0
    })
    
    try {
      console.log('=== 开始清空数据 ===')
      
      // Step 1: Stop any ongoing sync operations
      console.log('Step 1: 停止所有进行中的同步操作')
      const wasSyncing = repoStore.isSyncing
      
      if (wasSyncing) {
        loading.close()
        const stoppingMsg = ElMessage({
          message: '正在停止同步操作，请稍候...',
          type: 'warning',
          duration: 0
        })
        
        // Invalidate current sync session
        repoStore.$state.currentSyncId = 0
        repoStore.$state.isSyncing = false
        repoStore.$state.isFetching = false
        
        // Wait for sync to stop (max 3 seconds)
        let waitCount = 0
        while (repoStore.isSyncing && waitCount < 30) {
          await new Promise(resolve => setTimeout(resolve, 100))
          waitCount++
        }
        
        stoppingMsg.close()
        
        if (repoStore.isSyncing) {
          console.warn('  强制停止同步（超时）')
          repoStore.$state.isSyncing = false
          repoStore.$state.isFetching = false
        }
        
        // Re-show loading message
        loading = ElMessage({
          message: '正在清空数据...',
          type: 'info',
          duration: 0
        })
      }
      
      // Force stop all operations
      repoStore.$state.currentSyncId = 0
      repoStore.$state.isSyncing = false
      repoStore.$state.isFetching = false
      
      // Step 2: Immediately update UI to show 0 data
      dataStats.value = {
        repos: 0,
        tags: 0,
        taggedRepos: 0,
        untaggedRepos: 0
      }
      
      // Step 3: Clear all store state
      repoStore.$state.repos = []
      repoStore.$state.selectedTag = null
      repoStore.$state.selectedLanguage = null
      repoStore.$state.filterType = 'all'
      repoStore.$state.searchQuery = ''
      repoStore.$state.currentPage = 1
      repoStore.$state.syncProgress = { current: 0, total: 0, count: 0 }
      tagStore.$state.tags = []
      tagStore.$state.loading = false
      
      // Force Vue to update UI
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Step 4: Try to clear database (Method 1: Clear tables)
      let clearSuccess = false
      let clearAttempts = 0
      const maxAttempts = 3
      
      while (clearAttempts < maxAttempts && !clearSuccess) {
        try {
          clearAttempts++
          
          // Ensure database is open
          if (!db.isOpen()) {
            await db.open()
          }
          
          // Clear all canonical tables in one transaction.
          await runDataMutation(() =>
            db.transaction(
              'rw',
              db.repos,
              db.tags,
              db.repoTags,
              async () => {
                await db.repos.clear()
                await db.tags.clear()
                await db.repoTags.clear()
              }
            )
          )
          
          // Verify cleared
          const newRepoCount = await db.repos.count()
          const newTagCount = await db.tags.count()
          const newRepoTagCount = db.repoTags ? await db.repoTags.count() : 0
          
          if (newRepoCount === 0 && newTagCount === 0 && newRepoTagCount === 0) {
            clearSuccess = true
          } else {
            console.warn(`数据库表未完全清空: repos=${newRepoCount}, tags=${newTagCount}, repoTags=${newRepoTagCount}`)
          }
          
          break
        } catch (error) {
          console.error(`清空失败 (尝试 ${clearAttempts}):`, error)
          if (clearAttempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }
      
      // Step 5: If clear failed, try to delete and recreate database (Method 2: Nuclear option)
      if (!clearSuccess) {
        loading.close()
        
        const { ElMessageBox } = await import('element-plus')
        await ElMessageBox.confirm(
          '常规清空方式失败。需要删除并重建整个数据库。\n\n这将需要刷新页面。是否继续？',
          '需要重建数据库',
          {
            confirmButtonText: '删除并重建',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        try {
          if (db.isOpen()) {
            db.close()
          }
        } catch (e) {
          console.warn('数据库已关闭:', e)
        }
        
        await new Promise(resolve => setTimeout(resolve, 300))
        await Dexie.delete('StarHubDB')
        await new Promise(resolve => setTimeout(resolve, 500))
        await db.open()
        clearSuccess = true
      }
      
      // Step 6: Reload empty state
      await tagStore.loadTags()
      await loadDataStats()
      
      loading.close()
      ElMessage.success('所有数据已清空')
      
      // Auto navigate to home page
      setTimeout(() => {
        ElMessage({
          message: '数据已清空，正在返回主页...',
          type: 'success',
          duration: 1500
        })
        
        // Navigate to home page and reload
        setTimeout(() => {
          router.push('/').then(() => {
            window.location.reload()
          })
        }, 800)
      }, 500)
    } catch (error: any) {
      loading.close()
      console.error('=== 清空数据失败 ===', error)
      
      // Show detailed error
      await ElMessageBox.alert(
        `清空失败: ${error.message || '未知错误'}\n\n` +
        '请尝试以下步骤:\n' +
        '1. 刷新页面后重试\n' +
        '2. 清除浏览器缓存\n' +
        '3. 使用浏览器开发者工具手动删除 IndexedDB\n\n' +
        '或直接点击右上角菜单的"重新抓取"来清空并重新获取数据。',
        '清空失败',
        {
          confirmButtonText: '我知道了',
          type: 'error'
        }
      )
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Clear cancelled or failed:', error)
    }
  }
}
</script>

<style scoped lang="scss">
.settings-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  
  // 深色模式下使用与应用一致的背景色
  [data-theme='dark'] & {
    background-color: #1c2333 !important;
  }
}

.settings-header {
  padding: 24px 32px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  
  // 深色模式下使用与应用一致的背景色
  [data-theme='dark'] & {
    background-color: #252d3d !important;
    border-bottom-color: rgba(96, 165, 250, 0.2) !important;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.settings-content {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}

.settings-card {
  max-width: 800px;
  background-color: var(--bg-primary) !important;
  border-color: var(--border) !important;
  
  // 深色模式下使用与应用一致的背景色
  [data-theme='dark'] & {
    background-color: #252d3d !important;
    border-color: rgba(96, 165, 250, 0.2) !important;
  }

  :deep(.el-card__header) {
    background-color: var(--bg-secondary) !important;
    border-bottom-color: var(--border) !important;
    color: var(--text-primary) !important;
    
    // 深色模式下使用与应用一致的背景色
    [data-theme='dark'] & {
      background-color: #252d3d !important;
      border-bottom-color: rgba(96, 165, 250, 0.2) !important;
    }
  }
  
  :deep(.el-card__body) {
    background-color: var(--bg-primary) !important;
    color: var(--text-primary) !important;
    
    // 深色模式下使用与应用一致的背景色
    [data-theme='dark'] & {
      background-color: #252d3d !important;
    }
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
    color: var(--text-primary) !important;
  }
}

.form-tip {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.data-management {
  :deep(.el-alert) {
    background-color: var(--bg-tertiary) !important;
    border-color: var(--border) !important;
    color: var(--text-primary) !important;
    
    .el-alert__title {
      color: var(--text-primary) !important;
    }
    
    .el-alert__content {
      color: var(--text-secondary) !important;
    }
  }
  
}

.api-guide {
  ol {
    margin: 0;
    padding-left: 24px;

    li {
      margin-bottom: 8px;
      line-height: 1.6;

      a {
        color: var(--el-color-primary);
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}

.presets-section {
  :deep(.el-table) {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    
    th {
      background-color: var(--bg-tertiary) !important;
      color: var(--text-primary) !important;
      border-color: var(--border) !important;
    }
    
    td {
      background-color: var(--bg-primary) !important;
      color: var(--text-primary) !important;
      border-color: var(--border) !important;
    }
    
    tr:hover > td {
      background-color: var(--bg-tertiary) !important;
    }
  }
  
  .presets-table {
    :deep(.el-button.is-text) {
      color: var(--text-primary) !important;
      
      &:hover {
        color: var(--el-color-primary) !important;
        background-color: var(--bg-tertiary) !important;
      }
      
      &.is-text.is-danger {
        color: var(--el-color-danger) !important;
        
        &:hover {
          color: var(--el-color-danger) !important;
          background-color: var(--bg-tertiary) !important;
        }
      }
    }
  }
}

.data-management {
  .data-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  
  .data-stats {
    margin-top: 0;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    
    @media (max-width: 1200px) {
      grid-template-columns: repeat(2, 1fr);
    }
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }
  
  .stat-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: all 0.3s ease;
    animation: fadeIn 0.3s ease;
    
    // 深色模式下使用与应用一致的背景色
    [data-theme='dark'] & {
      background: #252d3d !important;
      border-color: rgba(96, 165, 250, 0.2) !important;
    }
    
    &:hover {
      border-color: var(--el-color-primary);
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      
      // 深色模式下使用品牌色边框
      [data-theme='dark'] & {
        border-color: #60a5fa !important;
        box-shadow: 0 2px 8px rgba(96, 165, 250, 0.2) !important;
      }
    }
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
  }
  
  .stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    transition: color 0.3s ease, transform 0.3s ease;
    
    &.is-zero {
      color: var(--text-tertiary);
      animation: scaleIn 0.3s ease;
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>

