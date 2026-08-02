<template>
  <div class="repo-card-tags" :class="{ edit: editMode }" @click="onContainerClick">
    <transition-group name="tag-list" tag="div">
      <div
        v-for="tag in activeRepoTags"
        :key="tag.id"
        :class="{ selected: tag.selected }"
        class="c-tag-item"
        @click.stop="toggleRepoTag(tag)"
      >
        <span v-if="tag.emoji" class="tag-emoji">{{ tag.emoji }}</span>
        {{ tag.name }}
      </div>
    </transition-group>
    <div v-if="editMode" class="c-repo-tags-footer">
      <span class="action-button cancel" @click.stop="closeEdit">
        <el-icon><Close /></el-icon>
        {{ t('common.cancel') }}
      </span>
      <span class="action-button confirm" @click.stop="confirmEdit">
        <el-icon><Check /></el-icon>
        {{ t('common.confirm') }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTagStore } from '@/stores/tag'
import { Close } from '@element-plus/icons-vue'

const { t } = useI18n()
const tagStore = useTagStore()

const props = defineProps<{
  repoId: number
  editMode: boolean
}>()

const emit = defineEmits<{
  'update:editMode': [value: boolean]
}>()

const localRepoTags = ref<
  Array<{ id: string; name: string; emoji?: string; selected: boolean }>
>([])

const repoTags = computed(() => {
  const seenIds = new Set<string>()
  let tags = tagStore.tags
    .filter(tag => {
      if (seenIds.has(tag.id)) return false
      seenIds.add(tag.id)
      return true
    })
    .map(tag => ({
      id: tag.id,
      name: tag.name,
      emoji: tag.emoji,
      selected: tag.repos.includes(props.repoId)
    }))

  if (!props.editMode) {
    tags = tags.filter(tag => tag.selected)
  }

  return tags
})

const updateLocalRepoTags = () => {
  if (!props.editMode) return

  localRepoTags.value = tagStore.tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    emoji: tag.emoji,
    selected: tag.repos.includes(props.repoId)
  }))
}

const activeRepoTags = computed(() => {
  return props.editMode ? localRepoTags.value : repoTags.value
})

watch(repoTags, updateLocalRepoTags)

onMounted(updateLocalRepoTags)

const onContainerClick = (event: Event) => {
  if (props.editMode) {
    event.stopPropagation()
  }
}

const toggleRepoTag = (tag: {
  id: string
  name: string
  emoji?: string
  selected: boolean
}) => {
  if (!props.editMode) return

  const index = localRepoTags.value.findIndex(item => item.id === tag.id)
  if (index > -1) {
    localRepoTags.value[index].selected = !localRepoTags.value[index].selected
  }
}

const closeEdit = () => {
  emit('update:editMode', false)
}

const confirmEdit = async () => {
  const selectedTagIds = localRepoTags.value
    .filter(tag => tag.selected)
    .map(tag => tag.id)

  await tagStore.replaceTagsForRepo(props.repoId, selectedTagIds)
  closeEdit()
}
</script>

<style lang="scss" scoped>
.repo-card-tags {
  user-select: none;
  padding: 0 $spacing-md;
  margin-top: $spacing-xs;

  &.edit {
    cursor: initial;
    .c-tag-item {
      cursor: pointer;
      &:hover {
        opacity: 0.8;
        transform: scale(1.05);
      }
    }
  }
}

.tag-list-enter-active,
.tag-list-leave-active {
  transition: all 0.3s;
}

.tag-list-enter-from,
.tag-list-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.tag-list-leave-active {
  position: absolute;
}

.c-tag-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s;
  margin: 3px 2px;
  border: 1px solid var(--border);
  border-radius: $radius-sm;
  padding: 2px 8px;
  line-height: 1.5;
  font-size: 0.75rem;
  color: var(--text-primary);
  background: var(--bg-tertiary);

  .tag-emoji {
    font-size: 0.875rem;
    line-height: 1;
  }

  &:hover {
    border-color: var(--el-color-primary);
  }

  &.selected {
    color: #fff;
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);

    &:hover {
      background: var(--el-color-primary-light-3);
      border-color: var(--el-color-primary-light-3);
    }
  }
}

.c-repo-tags-footer {
  margin-top: $spacing-sm;
  display: flex;
  align-items: center;
  justify-content: space-around;
  font-size: 0.875rem;
  gap: $spacing-sm;
}

.action-button {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: $radius-sm;
  cursor: pointer;
  transition: all $transition-base;

  :deep(.el-icon) {
    color: inherit;
  }

  &.cancel {
    color: var(--text-primary);
    background: var(--bg-secondary);
    border-color: var(--border);

    &:hover {
      background: var(--bg-tertiary);
      border-color: var(--text-tertiary);
    }
  }

  &.confirm {
    color: #fff;
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);

    &:hover {
      background: var(--el-color-primary-light-3);
      border-color: var(--el-color-primary-light-3);
    }
  }
}
</style>
