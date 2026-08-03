<template>
  <div class="detail-view">
    <div class="detail-content" v-if="repo">
      <!-- 仓库信息卡片 -->
      <div v-if="!readmeOnly" class="repo-card">
        <el-button
          text
          circle
          @click="$emit('close')"
          class="close-button"
        >
          <el-icon><Close /></el-icon>
        </el-button>
        <div class="repo-card-header">
          <div class="repo-info">
            <h1 class="repo-name">{{ repo.full_name }}</h1>
            <p v-if="repo.description" class="repo-desc">{{ repo.description }}</p>
          </div>
          <a class="github-link" :href="repo.html_url" target="_blank" rel="noopener">
            <el-icon><Link /></el-icon>
            <span>GitHub</span>
          </a>
        </div>
        
        <div class="repo-meta">
          <div class="meta-item" v-if="repo.language">
            <span class="lang-dot" :style="{ background: getLanguageColor(repo.language) }"></span>
            <span>{{ repo.language }}</span>
          </div>
          <div class="meta-item">
            <el-icon><Star /></el-icon>
            <span>{{ formatNumber(repo.stargazers_count) }}</span>
          </div>
          <div class="meta-item">
            <el-icon><ForkSpoon /></el-icon>
            <span>{{ formatNumber(repo.forks_count) }}</span>
          </div>
          <div class="meta-item" v-if="repo.license">
            <span class="license-badge">{{ repo.license.spdx_id || 'License' }}</span>
          </div>
          <div class="meta-item updated">
            Updated {{ formatDate(repo.updated_at) }}
          </div>
        </div>
      </div>

      <!-- README -->
      <div class="readme-section">
        <div class="readme-header">
          <el-icon><Document /></el-icon>
          <span>README</span>
        </div>
        <div v-if="readmeLoading" class="readme-state">
          <el-skeleton :rows="8" animated />
        </div>
        <div v-else-if="readmeError" class="readme-state readme-error">
          <span>{{ readmeError }}</span>
          <a
            v-if="readmeTooLarge"
            :href="repo.html_url"
            target="_blank"
            rel="noopener noreferrer"
          >
            在 GitHub 查看 README
          </a>
          <el-button v-else size="small" @click="scheduleReadmeLoad(0)">
            重试
          </el-button>
        </div>
        <div v-else-if="!readme" class="readme-state">
          该仓库暂无 README。
        </div>
        <div v-else class="readme-content markdown-body" :data-color-mode="themeStore.theme" data-light-theme="light" data-dark-theme="dark" v-html="readme"></div>
      </div>
    </div>

    <el-dialog
      v-if="!readmeOnly"
      v-model="showTagDialog"
      title="Add Tag"
      width="400px"
    >
      <el-select
        v-model="selectedTagId"
        placeholder="Select a tag"
        filterable
        style="width: 100%"
      >
        <el-option
          v-for="tag in availableTags"
          :key="tag.id"
          :label="tag.name"
          :value="tag.id"
        >
          <span
            class="tag-option"
            :style="{ color: tag.color }"
          >
            <span
              class="tag-color-dot"
              :style="{ backgroundColor: tag.color }"
            ></span>
            <span v-if="tag.emoji" class="tag-emoji">{{ tag.emoji }}</span>
            {{ tag.name }}
          </span>
        </el-option>
      </el-select>
      <template #footer>
        <el-button @click="showTagDialog = false">Cancel</el-button>
        <el-button type="primary" @click="handleAddTag">Add</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { useTagStore } from '@/stores/tag'
import { useThemeStore } from '@/stores/theme'
import { githubApi } from '@/api/github'
import { getLanguageColor } from '@/utils/languageColors'
import { formatNumber, formatDate } from '@/utils'
import {
  ReadmeWorkerError,
  renderReadmeOffThread,
  shutdownReadmeRenderer
} from '@/services/readmeRenderer'

// 导入 highlight.js GitHub 样式
import 'highlight.js/styles/github.css'

// 导入 GitHub 官方 Markdown 样式（自动主题版本）
import 'github-markdown-css'

import DOMPurify from 'dompurify'
import type { Repository, Tag } from '@/types'
import {
  Close,
  Document,
  Link,
  ForkSpoon
} from '@element-plus/icons-vue'

const README_SELECTION_DEBOUNCE_MS = 140

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName === 'IMG') {
    node.setAttribute('loading', 'lazy')
    node.setAttribute('decoding', 'async')
  }
})

const themeStore = useThemeStore()

const props = defineProps<{
  repo: Repository
  readmeOnly?: boolean
}>()

defineEmits<{
  close: []
}>()

const tagStore = useTagStore()
const repoTags = ref<Tag[]>([])
const readme = ref('')
const readmeLoading = ref(false)
const readmeError = ref('')
const readmeTooLarge = ref(false)
const showTagDialog = ref(false)
const selectedTagId = ref('')
let readmeRequestId = 0
let readmeController: AbortController | null = null
let readmeDebounceTimer: number | null = null
let repoTagsRequestId = 0

const availableTags = computed(() => {
  const currentTagIds = repoTags.value.map((t) => t.id)
  return tagStore.tags.filter((tag) => !currentTagIds.includes(tag.id))
})

interface ReadmeRepositorySnapshot {
  fullName: string
  defaultBranch: string
}

const isCurrentReadmeRequest = (
  requestId: number,
  controller?: AbortController
) => requestId === readmeRequestId && !controller?.signal.aborted

const cancelReadmeLoad = () => {
  if (readmeDebounceTimer !== null) {
    window.clearTimeout(readmeDebounceTimer)
    readmeDebounceTimer = null
  }
  readmeController?.abort()
  readmeController = null
}

const loadReadme = async (
  requestId: number,
  repoSnapshot: ReadmeRepositorySnapshot
) => {
  if (!isCurrentReadmeRequest(requestId)) return

  const controller = new AbortController()
  readmeController = controller

  try {
    const [owner, repo] = repoSnapshot.fullName.split('/')
    const defaultBranch = repoSnapshot.defaultBranch
    const response = await githubApi.getReadme(owner, repo, controller.signal)
    if (!isCurrentReadmeRequest(requestId, controller)) return

    const html = await renderReadmeOffThread(
      response.data,
      { owner, repo, defaultBranch },
      controller.signal
    )
    if (!isCurrentReadmeRequest(requestId, controller)) return

    readme.value = DOMPurify.sanitize(html, {
      ADD_ATTR: [
        'target',
        'rel',
        'class',
        'id',
        'checked',
        'disabled',
        'type',
        'loading',
        'decoding'
      ],
      ADD_TAGS: ['input', 'span'],
      FORBID_TAGS: ['script', 'style'],
      KEEP_CONTENT: true
    })
  } catch (error) {
    if (
      controller.signal.aborted ||
      requestId !== readmeRequestId ||
      (isAxiosError(error) && error.code === 'ERR_CANCELED')
    ) {
      return
    }

    console.error('Failed to load README:', error)
    readmeTooLarge.value = error instanceof ReadmeWorkerError && (
      error.code === 'source_too_large' || error.code === 'html_too_large'
    )
    readmeError.value = readmeTooLarge.value
      ? 'README 内容过大，为避免页面卡顿，已停止在页面内渲染。'
      : isAxiosError(error) && error.response?.status === 404
        ? '该仓库暂无 README。'
        : 'README 加载失败，请稍后重试。'
  } finally {
    if (requestId === readmeRequestId) {
      readmeLoading.value = false
      if (readmeController === controller) {
        readmeController = null
      }
    }
  }
}

const scheduleReadmeLoad = (delay = README_SELECTION_DEBOUNCE_MS) => {
  const requestId = ++readmeRequestId
  cancelReadmeLoad()
  readme.value = ''
  readmeError.value = ''
  readmeTooLarge.value = false
  readmeLoading.value = true

  const repoSnapshot: ReadmeRepositorySnapshot = {
    fullName: props.repo.full_name,
    defaultBranch: props.repo.default_branch || 'main'
  }
  readmeDebounceTimer = window.setTimeout(() => {
    readmeDebounceTimer = null
    void loadReadme(requestId, repoSnapshot)
  }, delay)
}

const loadRepoTags = async () => {
  if (props.readmeOnly) {
    repoTags.value = []
    return
  }

  const requestId = ++repoTagsRequestId
  const repoId = props.repo.id
  const tags = await tagStore.getRepoTags(repoId)
  if (requestId === repoTagsRequestId && repoId === props.repo.id) {
    repoTags.value = tags
  }
}

const handleAddTag = async () => {
  if (!selectedTagId.value) return

  try {
    await tagStore.addTagToRepo(props.repo.id, selectedTagId.value)
    await loadRepoTags()
    showTagDialog.value = false
    selectedTagId.value = ''
  } catch (error) {
    console.error('Failed to add tag:', error)
  }
}

// const handleRemoveTag = async (tagId: string) => {
//   try {
//     await tagStore.removeTagFromRepo(props.repo.id, tagId)
//     await loadRepoTags()
//   } catch (error) {
//     console.error('Failed to remove tag:', error)
//   }
// }

// const openInGitHub = () => {
//   window.open(props.repo.html_url, '_blank')
// }

watch(
  () => props.repo.id,
  () => {
    if (props.repo) {
      scheduleReadmeLoad()
      if (!props.readmeOnly) {
        loadRepoTags()
      }
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  readmeRequestId++
  repoTagsRequestId++
  cancelReadmeLoad()
  shutdownReadmeRenderer()
})
</script>

<style lang="scss" scoped>
.detail-view {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  background: var(--bg-primary);
  position: relative;
  
  // 深色模式下使用与应用一致的背景色
  [data-theme='dark'] & {
    background: #1c2333 !important;
  }
}

.detail-content {
  padding: $spacing-md;
  max-width: 100%;
  margin: 0;
}

// 仓库信息卡片
.repo-card {
  position: relative;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 16px;
  padding-top: 12px;
  margin-bottom: 16px;
  
  // 深色模式下使用与应用一致的背景色
  [data-theme='dark'] & {
    background: #252d3d !important;
    border-color: rgba(96, 165, 250, 0.2) !important;
  }
}

.close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  color: var(--text-tertiary);
  
  &:hover {
    color: var(--text-primary);
    background: var(--bg-tertiary);
  }
}

.repo-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.repo-info {
  flex: 1;
  min-width: 0;
}

.repo-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--el-color-primary);
  margin: 0 0 6px 0;
  word-break: break-word;
}

.repo-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.github-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--el-color-primary);
  color: #fff;
  border-radius: 3px;
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
  flex-shrink: 0;
  
  &:hover {
    background: var(--el-color-primary-dark-2);
  }
  
  .el-icon {
    font-size: 14px;
  }
}

.repo-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  
  .el-icon {
    font-size: 14px;
    color: var(--text-tertiary);
  }
  
  &.updated {
    margin-left: auto;
    font-size: 0.8rem;
    color: var(--text-tertiary);
  }
}

.lang-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.license-badge {
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.readme-section {
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
  
  // 深色模式下使用与应用一致的边框色
  [data-theme='dark'] & {
    border-color: rgba(96, 165, 250, 0.2) !important;
  }
}

.readme-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  
  // 深色模式下使用与应用一致的背景色
  [data-theme='dark'] & {
    background: #252d3d !important;
    border-bottom-color: rgba(96, 165, 250, 0.2) !important;
  }
  
  .el-icon {
    color: var(--text-secondary);
  }
}

.readme-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  padding: 24px;
  color: var(--text-secondary);
  background: var(--bg-primary);

  .el-skeleton {
    width: 100%;
  }

  [data-theme='dark'] & {
    background: #1c2333;
  }
}

.readme-error {
  flex-direction: column;
  gap: 12px;
  color: var(--el-color-danger);
}

.readme-content {
  // github-markdown-css 提供了 .markdown-body 的所有样式
  padding: 16px;
  box-sizing: border-box;
  min-width: 200px;
  max-width: 100%;
  background: var(--bg-primary);

  // Skip layout and paint work for README sections below the viewport.
  :deep(> *) {
    content-visibility: auto;
    contain-intrinsic-size: auto 120px;
  }
  
  // 深色模式下使用与应用一致的背景色
  [data-theme='dark'] & {
    background: #1c2333 !important;
  }
  
  // 徽章对齐
  :deep(p) {
    img[src*="shields.io"],
    img[src*="badge"],
    img[src*="img.shields"],
    img[alt*="badge"],
    a > img {
      display: inline-block;
      vertical-align: middle;
      margin: 2px 4px 2px 0;
      height: auto;
    }
  }
  
  // 图片加载失败时的占位
  :deep(img) {
    max-width: 100%;
    
    &[src=""],
    &:not([src]) {
      display: none;
    }
  }
  
  // 代码块样式
  :deep(pre) {
    background: #f6f8fa;
    border-radius: 3px;
    padding: 16px;
    overflow: auto;
    
    code {
      background: transparent;
      padding: 0;
      border: none;
      font-size: 85%;
      font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
    }
  }
  
  // 暗色主题
  &[data-color-mode='dark'] {
    background: #0d1117;
    color: #c9d1d9;
    border-color: #30363d;
    
    :deep(h1),
    :deep(h2),
    :deep(h3),
    :deep(h4),
    :deep(h5),
    :deep(h6) {
      color: #c9d1d9;
      border-color: #30363d;
    }
    
    :deep(a) {
      color: #58a6ff;
    }
    
    :deep(code) {
      background: rgba(110, 118, 129, 0.4);
      color: #c9d1d9;
    }
    
    :deep(pre) {
      background: #161b22;
      
      code {
        background: transparent;
      }
    }
    
    :deep(blockquote) {
      border-color: #3b434b;
      color: #8b949e;
    }
    
    :deep(table) {
      th, td {
        border-color: #30363d;
      }
      
      tr {
        background: #0d1117;
        border-color: #30363d;
        
        &:nth-child(2n) {
          background: #161b22;
        }
      }
    }
    
    :deep(hr) {
      background: #21262d;
    }
    
    // GitHub Dark 代码高亮配色
    :deep(.hljs) {
      color: #c9d1d9;
    }
    
    :deep(.hljs-keyword),
    :deep(.hljs-selector-tag),
    :deep(.hljs-literal),
    :deep(.hljs-section),
    :deep(.hljs-link) {
      color: #ff7b72;
    }
    
    :deep(.hljs-string),
    :deep(.hljs-attr) {
      color: #a5d6ff;
    }
    
    :deep(.hljs-number),
    :deep(.hljs-built_in),
    :deep(.hljs-builtin-name) {
      color: #79c0ff;
    }
    
    :deep(.hljs-title),
    :deep(.hljs-function),
    :deep(.hljs-title.function_) {
      color: #d2a8ff;
    }
    
    :deep(.hljs-comment),
    :deep(.hljs-quote) {
      color: #8b949e;
    }
    
    :deep(.hljs-variable),
    :deep(.hljs-template-variable) {
      color: #ffa657;
    }
    
    :deep(.hljs-tag),
    :deep(.hljs-name) {
      color: #7ee787;
    }
    
    :deep(.hljs-type),
    :deep(.hljs-class) {
      color: #f0883e;
    }
    
    :deep(.hljs-symbol),
    :deep(.hljs-bullet),
    :deep(.hljs-addition) {
      color: #a5d6ff;
    }
    
    :deep(.hljs-meta),
    :deep(.hljs-params) {
      color: #79c0ff;
    }
    
    :deep(.hljs-punctuation) {
      color: #c9d1d9;
    }
  }
}

.tag-option {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.tag-color-dot {
  width: 10px;
  height: 10px;
  border-radius: $radius-round;
}
</style>
