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
        <div class="repo-info">
          <h1 class="repo-name">{{ repo.full_name }}</h1>
          <p v-if="repo.description" class="repo-description">
            {{ repo.description }}
          </p>
        </div>

        <a
          class="github-link"
          :href="repo.html_url"
          target="_blank"
          rel="noopener noreferrer"
        >
          <el-icon><Link /></el-icon>
          <span>GitHub</span>
        </a>
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

      <RepositoryOverview
        :repo="repo"
        @unstarred="emit('unstarred', $event)"
      />
    </div>

    <DetailView class="readme-only" :repo="repo" />
  </div>
</template>

<script setup lang="ts">
import type { Repository } from '@/types'
import { formatDate, formatNumber } from '@/utils'
import { getLanguageColor } from '@/utils/languageColors'
import {
  Close,
  ForkSpoon,
  Link,
  Star
} from '@element-plus/icons-vue'
import DetailView from './DetailView.vue'
import RepositoryOverview from './RepositoryOverview.vue'

defineProps<{
  repo: Repository
}>()

const emit = defineEmits<{
  close: []
  unstarred: [repoId: number]
}>()
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-right: 34px;
  margin-bottom: 14px;
}

.repo-info {
  flex: 1;
  min-width: 0;
}

.repo-name {
  margin: 0 0 6px;
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

.github-link {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 6px;
  padding: 6px 12px;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
  background: var(--el-color-primary);
  border-radius: 3px;

  &:hover {
    background: var(--el-color-primary-dark-2);
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

  :deep(.repo-card) {
    display: none;
  }

  :deep(.detail-content) {
    padding-top: 16px;
  }
}

@media (max-width: 768px) {
  .summary-card {
    margin: 10px 10px 0;
  }

  .summary-header {
    align-items: stretch;
    flex-direction: column;
  }

  .github-link {
    align-self: flex-start;
  }

  .meta-item.updated {
    width: 100%;
    margin-left: 0;
  }
}
</style>
