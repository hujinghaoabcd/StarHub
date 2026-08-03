<template>
  <div class="repo-card" :class="{ 'is-active': isActive, 'is-selected': selected, 'select-mode': selectMode }" @click="$emit('click')">
    <div class="repo-header">
      <el-checkbox
        v-if="selectMode"
        :model-value="selected"
        @update:model-value="$emit('select', $event)"
        @click.stop
        class="repo-checkbox"
        style="flex-shrink: 0;"
      />
      <div class="repo-title" @click.stop>
        <a :href="repo.html_url" target="_blank" class="repo-link">
          <span class="repo-owner">{{ repo.owner.login }}</span> /
          <span class="repo-name">{{ repo.name }}</span>
        </a>
      </div>
      <div class="repo-card-actions">
        <button
          type="button"
          class="repo-highlight-toggle"
          :class="{ 'is-highlighted': highlighted }"
          :aria-pressed="highlighted"
          :title="highlighted ? t('highlight.unmark') : t('highlight.mark')"
          @click.stop="$emit('toggle-highlight')"
        >
          <el-icon><CollectionTag /></el-icon>
        </button>
        <button
          type="button"
          class="repo-tag-toggle-btn"
          :title="editMode ? t('common.close') : t('repo.addTag')"
          @click.stop="toggleTagEdit"
        >
          <el-icon><Collection /></el-icon>
        </button>
      </div>
    </div>

    <p v-if="repo.description" class="repo-description">
      {{ repo.description }}
    </p>

    <RepoCardTags
      v-if="repo.id"
      :repoId="repo.id"
      :editMode="editMode"
      @update:editMode="editMode = $event"
    />

    <div class="repo-footer">
      <div class="repo-meta">
        <span
          v-if="repo.language"
          class="repo-language"
        >
          <span
            class="language-dot"
            :style="{ backgroundColor: getLanguageColor(repo.language) }"
          ></span>
          {{ repo.language }}
        </span>
        <span class="repo-updated">
          {{ t('repo.updated') }} {{ formatDate(repo.updated_at) }}
        </span>
      </div>
      <div class="repo-stats">
        <span class="repo-stat-item">
          <el-icon class="stat-icon"><Star /></el-icon>
          {{ formatNumber(repo.stargazers_count) }}
        </span>
        <span class="repo-stat-item">
          <el-icon class="stat-icon"><ForkSpoon /></el-icon>
          {{ formatNumber(repo.forks_count) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getLanguageColor } from '@/utils/languageColors'
import { formatNumber, formatDate } from '@/utils'
import type { Repository } from '@/types'
import {
  Star,
  Collection,
  CollectionTag,
  ForkSpoon
} from '@element-plus/icons-vue'
import RepoCardTags from './RepoCardTags.vue'

const { t } = useI18n()

const props = defineProps<{
  repo: Repository
  isActive?: boolean
  selected?: boolean
  selectMode?: boolean
  highlighted?: boolean
}>()

defineEmits<{
  click: []
  select: [selected: boolean]
  'toggle-highlight': []
}>()

const editMode = ref(false)

const toggleTagEdit = () => {
  editMode.value = !editMode.value
}

// Reset edit mode when repo changes
watch(() => props.repo.id, () => {
  editMode.value = false
})
</script>

<style lang="scss" scoped>
.repo-card {
  position: relative;
  padding: $spacing-md;
  background: var(--bg-secondary);
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-base;
  border: 1px solid transparent;
  border-left: 2px solid transparent;

  &:hover {
    background: var(--bg-tertiary);
    border-color: var(--border);
    
    .repo-tag-toggle-btn {
      opacity: 1;
    }
  }

  &.is-active {
    background: var(--bg-tertiary);
    border-left-color: var(--el-color-primary);
    
    .repo-tag-toggle-btn {
      opacity: 1;
    }
  }
}

.repo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-sm;
  position: relative;
  
  .repo-checkbox {
    margin-right: $spacing-sm;
  }
}

.repo-card.select-mode {
  cursor: default;
  
  &:hover {
    background: var(--bg-tertiary);
    border-color: var(--border);
  }
  
  &.is-selected {
    background: var(--bg-tertiary);
    border-color: var(--el-color-primary);
    border-left-color: var(--el-color-primary);
    border-left-width: 3px;
  }
}

.repo-title {
  flex: 1;
  min-width: 0;

    .repo-link {
      text-decoration: none;
      color: var(--text-primary);
      font-weight: 600;
      font-size: 0.875rem;
    
    &:hover {
      color: var(--el-color-primary);
      text-decoration: underline;
    }
    
    .repo-owner {
      color: var(--text-secondary);
    }
    
    .repo-name {
      color: var(--text-primary);
    }
  }
}

.repo-card-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 2px;
  margin-left: $spacing-xs;
}

.repo-highlight-toggle,
.repo-tag-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 16px;
  user-select: none;
  color: var(--text-tertiary);
  background: transparent;
  border: 0;
  border-radius: $radius-sm;
  cursor: pointer;
  transition: color $transition-base, background $transition-base,
    opacity $transition-base;
  
  :deep(.el-icon) {
    color: var(--text-tertiary);
    transition: color $transition-base;
  }
  
  &:hover {
    background: var(--bg-primary);

    :deep(.el-icon) {
      color: var(--el-color-primary);
    }
  }
}

.repo-tag-toggle-btn {
  opacity: 0;
}

.repo-highlight-toggle.is-highlighted {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);

  :deep(.el-icon) {
    color: #f59e0b;
  }
}

.repo-description {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: $spacing-sm;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.repo-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $spacing-sm;
  font-size: 0.8125rem;
  color: var(--text-tertiary);
}

.repo-meta {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.repo-language {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.language-dot {
  width: 10px;
  height: 10px;
  border-radius: $radius-round;
}

.repo-stats {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.repo-stat-item {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  
  .stat-icon {
    color: #fbbf24;
    font-size: 14px;
  }
}
</style>
