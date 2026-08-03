<template>
  <div class="repository-detail-view">
    <div class="summary-card">
      <el-button
        text
        circle
        class="close-button"
        aria-label="关闭仓库详情"
        @click="emit('close')"
      >
        <el-icon><Close /></el-icon>
      </el-button>

      <div class="summary-header">
        <div class="summary-title-row">
          <h1 class="repo-name">{{ repo.full_name }}</h1>
          <div class="summary-actions">
            <el-button
              size="small"
              type="warning"
              class="highlight-button"
              :class="{ 'is-highlighted': highlighted }"
              :loading="highlightStore.isMutating"
              :aria-pressed="highlighted"
              @click="handleToggleHighlight"
            >
              <el-icon><CollectionTag /></el-icon>
              <span>
                {{
                  highlighted ? t('highlight.unmark') : t('highlight.mark')
                }}
              </span>
            </el-button>
            <a
              class="github-link"
              :href="repo.html_url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <el-icon><Link /></el-icon>
              <span>GitHub</span>
            </a>
            <RepositoryOverview
              :repo="repo"
              @unstarred="emit('unstarred', $event)"
            />
          </div>
        </div>

        <p v-if="repo.description" class="repo-description">
          {{ repo.description }}
        </p>
        <div v-if="homepageUrl" class="repo-about">
          <span class="about-label">About</span>
          <a :href="homepageUrl" target="_blank" rel="noopener noreferrer">
            {{ homepageUrl }}
          </a>
        </div>
        <div v-if="pagesUrl" class="repo-about repo-pages">
          <span class="about-label">GitHub Pages</span>
          <a :href="pagesUrl" target="_blank" rel="noopener noreferrer">
            {{ pagesUrl }}
          </a>
        </div>
      </div>

      <div class="repo-meta">
        <div v-if="repo.language" class="meta-item">
          <span
            class="language-dot"
            :style="{ background: getLanguageColor(repo.language) }"
          ></span>
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
        <div v-if="repo.license" class="meta-item">
          <span class="license-badge">
            {{ repo.license.spdx_id || 'License' }}
          </span>
        </div>
        <div class="meta-item updated">
          Updated {{ formatDate(repo.updated_at) }}
        </div>
      </div>
    </div>

    <DetailView class="readme-only" :repo="repo" :readme-only="true" />
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { isAxiosError } from 'axios'
import type { Repository } from '@/types'
import { githubApi } from '@/api/github'
import { formatDate, formatNumber } from '@/utils'
import { getLanguageColor } from '@/utils/languageColors'
import { useHighlightStore } from '@/stores/highlight'
import {
  Close,
  CollectionTag,
  ForkSpoon,
  Link,
  Star
} from '@element-plus/icons-vue'
import DetailView from './DetailView.vue'
import RepositoryOverview from './RepositoryOverview.vue'

const { t } = useI18n()
const highlightStore = useHighlightStore()

const props = defineProps<{
  repo: Repository
}>()

const emit = defineEmits<{
  close: []
  unstarred: [repoId: number]
}>()

function safeHttpUrl(value: string | undefined | null): string | null {
  if (!value) return null

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null
  } catch {
    return null
  }
}

const homepageUrl = computed(() => safeHttpUrl(props.repo.homepage))
const pagesUrl = ref<string | null>(null)
const highlighted = computed(() =>
  highlightStore.highlightedIdSet.has(props.repo.id)
)
const PAGES_SELECTION_DEBOUNCE_MS = 140
let pagesRequestId = 0
let pagesController: AbortController | null = null
let pagesDebounceTimer: number | null = null

interface PagesRepositorySnapshot {
  owner: string
  repoName: string
}

async function handleToggleHighlight() {
  try {
    const isHighlighted = await highlightStore.toggleHighlight(props.repo.id)
    ElMessage.success(
      isHighlighted ? t('highlight.marked') : t('highlight.unmarked')
    )
  } catch (error) {
    console.error('Failed to toggle repository highlight:', error)
    ElMessage.error(t('highlight.failed'))
  }
}

async function loadPagesUrl(
  requestId: number,
  snapshot: PagesRepositorySnapshot
) {
  if (requestId !== pagesRequestId) return

  const controller = new AbortController()
  pagesController = controller

  try {
    const response = await githubApi.getRepositoryPages(
      snapshot.owner,
      snapshot.repoName,
      controller.signal
    )
    if (requestId === pagesRequestId && !controller.signal.aborted) {
      pagesUrl.value = safeHttpUrl(response.data.html_url)
    }
  } catch (error) {
    if (
      !controller.signal.aborted &&
      requestId === pagesRequestId &&
      !(isAxiosError(error) && error.code === 'ERR_CANCELED')
    ) {
      console.warn('Failed to load GitHub Pages URL:', error)
    }
  } finally {
    if (pagesController === controller) {
      pagesController = null
    }
  }
}

function schedulePagesUrlLoad() {
  const requestId = ++pagesRequestId
  if (pagesDebounceTimer !== null) {
    window.clearTimeout(pagesDebounceTimer)
    pagesDebounceTimer = null
  }
  pagesController?.abort()
  pagesController = null
  pagesUrl.value = null

  if (props.repo.has_pages === false) return

  const [owner, repoName] = props.repo.full_name.split('/')
  if (!owner || !repoName) return

  const snapshot = { owner, repoName }
  pagesDebounceTimer = window.setTimeout(() => {
    pagesDebounceTimer = null
    void loadPagesUrl(requestId, snapshot)
  }, PAGES_SELECTION_DEBOUNCE_MS)
}

watch(() => props.repo.id, schedulePagesUrlLoad, { immediate: true })

onUnmounted(() => {
  pagesRequestId++
  if (pagesDebounceTimer !== null) {
    window.clearTimeout(pagesDebounceTimer)
    pagesDebounceTimer = null
  }
  pagesController?.abort()
  pagesController = null
})
</script>

<style lang="scss" scoped>
.repository-detail-view {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  background: var(--bg-primary);
}

.summary-card {
  position: relative;
  flex-shrink: 0;
  margin: 16px 16px 0;
  padding: 14px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;

  [data-theme='dark'] & {
    background: #252d3d;
    border-color: rgba(96, 165, 250, 0.2);
  }
}

.close-button {
  position: absolute;
  top: 7px;
  right: 7px;
  z-index: 2;
  color: var(--text-tertiary);

  &:hover {
    color: var(--text-primary);
    background: var(--bg-tertiary);
  }
}

.summary-header {
  margin-bottom: 14px;
}

.summary-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px;
  padding-right: 34px;
  margin-bottom: 6px;
}

.repo-name {
  flex: 1 1 240px;
  min-width: 0;
  margin: 0;
  color: var(--el-color-primary);
  font-size: 1.1rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.repo-description {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
}

.repo-about {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
  margin-top: 8px;
  font-size: 0.8rem;

  a {
    min-width: 0;
    overflow: hidden;
    color: var(--el-color-primary);
    text-decoration: none;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover {
      text-decoration: underline;
    }
  }
}

.about-label {
  flex-shrink: 0;
  color: var(--text-secondary);
  font-weight: 600;
}

.summary-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 5px;
}

.highlight-button {
  height: 28px;
  padding: 0 8px;
  margin: 0;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
  background: var(--el-color-warning);
  border-color: var(--el-color-warning);
  border-radius: 3px;

  :deep(.el-icon) {
    font-size: 0.76rem;
  }

  &:hover,
  &:focus-visible {
    color: #fff;
    background: var(--el-color-warning-dark-2);
    border-color: var(--el-color-warning-dark-2);
  }

  &.is-highlighted {
    color: #fff;
    background: #d97706;
    border-color: #d97706;
  }
}

.github-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  flex-shrink: 0;
  gap: 4px;
  padding: 0 8px;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
  background: var(--el-color-primary);
  border: 1px solid var(--el-color-primary);
  border-radius: 3px;

  .el-icon {
    font-size: 0.76rem;
  }

  &:hover,
  &:focus-visible {
    background: var(--el-color-primary-dark-2);
    border-color: var(--el-color-primary-dark-2);
  }
}

.repo-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-secondary);
  font-size: 0.85rem;

  &.updated {
    margin-left: auto;
    color: var(--text-tertiary);
    font-size: 0.8rem;
  }
}

.language-dot {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  border-radius: 50%;
}

.license-badge {
  padding: 2px 8px;
  color: var(--text-secondary);
  font-size: 0.75rem;
  background: var(--bg-tertiary);
  border-radius: 2px;
}

.readme-only {
  flex: 1;
  min-height: 0;

  :deep(.detail-content) {
    padding-top: 16px;
  }
}

@media (max-width: 768px) {
  .summary-card {
    margin: 10px 10px 0;
  }

  .summary-title-row {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }

  .summary-actions {
    flex-wrap: wrap;
  }

  .meta-item.updated {
    width: 100%;
    margin-left: 0;
  }
}
</style>
