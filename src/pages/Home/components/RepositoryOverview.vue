<template>
  <section class="repository-overview" aria-label="Repository links and actions">
    <div class="overview-main">
      <div class="overview-title-row">
        <div>
          <div class="overview-title">项目链接</div>
          <div class="overview-subtitle">
            显示 GitHub About 网站和实际 GitHub Pages 地址
          </div>
        </div>
        <el-button
          type="danger"
          plain
          size="small"
          :loading="unstarLoading"
          :disabled="repo.private || repoStore.isSyncing"
          @click="handleUnstar"
        >
          取消 Star
        </el-button>
      </div>

      <div class="link-grid">
        <div class="link-item">
          <span class="link-label">GitHub</span>
          <a
            class="link-value"
            :href="repo.html_url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ repo.html_url }}
          </a>
        </div>

        <div class="link-item">
          <span class="link-label">About</span>
          <a
            v-if="homepageUrl"
            class="link-value"
            :href="homepageUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ homepageUrl }}
          </a>
          <span v-else class="link-empty">
            {{ linksLoading ? '正在读取…' : '未配置网站' }}
          </span>
        </div>

        <div class="link-item">
          <span class="link-label">GitHub Pages</span>
          <a
            v-if="pagesUrl"
            class="link-value"
            :href="pagesUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ pagesUrl }}
          </a>
          <span v-else class="link-empty">
            {{ linksLoading ? '正在读取…' : '未启用或无法读取' }}
          </span>
        </div>
      </div>

      <div v-if="repo.private" class="permission-note">
        当前 OAuth 配置不申请私有仓库写权限，因此不能在 StarHub 中取消私有仓库的 Star。
      </div>
      <div v-else class="permission-note">
        取消 Star 会同步修改 GitHub 账户，并从本地列表和标签关系中移除该项目。
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { githubApi } from '@/api/github'
import { useRepoStore } from '@/stores/repo'
import type { Repository, RepositoryPagesSite } from '@/types'

const props = defineProps<{
  repo: Repository
}>()

const emit = defineEmits<{
  unstarred: [repoId: number]
}>()

const repoStore = useRepoStore()
const repositoryDetails = ref<Repository | null>(null)
const pagesSite = ref<RepositoryPagesSite | null>(null)
const linksLoading = ref(false)
const unstarLoading = ref(false)
let loadSequence = 0

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

const homepageUrl = computed(() =>
  safeHttpUrl(repositoryDetails.value?.homepage || props.repo.homepage)
)
const pagesUrl = computed(() => safeHttpUrl(pagesSite.value?.html_url))

async function loadRepositoryLinks() {
  const sequence = ++loadSequence
  const [owner, name] = props.repo.full_name.split('/')

  repositoryDetails.value = props.repo
  pagesSite.value = null
  linksLoading.value = true

  if (!owner || !name) {
    linksLoading.value = false
    return
  }

  try {
    const detailsResponse = await githubApi.getRepository(owner, name)
    if (sequence !== loadSequence) return

    repositoryDetails.value = detailsResponse.data

    if (!detailsResponse.data.has_pages) {
      return
    }

    try {
      const pagesResponse = await githubApi.getRepositoryPages(owner, name)
      if (sequence === loadSequence) {
        pagesSite.value = pagesResponse.data
      }
    } catch (error) {
      if (!isAxiosError(error) || error.response?.status !== 404) {
        console.warn('Failed to load GitHub Pages metadata:', error)
      }
    }
  } catch (error) {
    console.warn('Failed to load repository link metadata:', error)
  } finally {
    if (sequence === loadSequence) {
      linksLoading.value = false
    }
  }
}

async function handleUnstar() {
  if (repoStore.isSyncing) {
    ElMessage.warning('仓库正在同步，请等待同步完成后再取消 Star。')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定取消 ${props.repo.full_name} 的 Star 吗？此操作会同时修改你的 GitHub 账户。`,
      '确认取消 Star',
      {
        confirmButtonText: '取消 Star',
        cancelButtonText: '保留',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
  } catch {
    return
  }

  unstarLoading.value = true

  try {
    await repoStore.unstarRepository(props.repo)
    ElMessage.success(`已取消 ${props.repo.full_name} 的 Star`)
    emit('unstarred', props.repo.id)
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status : undefined

    if (status === 403 || status === 404) {
      await ElMessageBox.alert(
        '当前 GitHub 会话可能没有 public_repo 权限，或该仓库不可访问。请退出 StarHub 后重新使用 GitHub 登录并确认公开仓库权限。',
        '无法取消 Star',
        {
          confirmButtonText: '我知道了',
          type: 'error'
        }
      )
    } else {
      ElMessage.error('取消 Star 失败，远端和本地数据均未主动删除。')
    }

    console.error('Failed to unstar repository:', error)
  } finally {
    unstarLoading.value = false
  }
}

watch(
  () => props.repo.id,
  () => {
    void loadRepositoryLinks()
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.repository-overview {
  flex-shrink: 0;
  padding: 12px 16px 0;
  background: var(--bg-primary);
}

.overview-main {
  padding: 14px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
}

.overview-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.overview-title {
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 600;
}

.overview-subtitle,
.permission-note {
  color: var(--text-tertiary);
  font-size: 0.76rem;
  line-height: 1.5;
}

.link-grid {
  display: grid;
  gap: 8px;
}

.link-item {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 10px;
  align-items: baseline;
  font-size: 0.82rem;
}

.link-label {
  color: var(--text-secondary);
  font-weight: 600;
}

.link-value {
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

.link-empty {
  color: var(--text-tertiary);
}

.permission-note {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

@media (max-width: 768px) {
  .repository-overview {
    padding: 10px 10px 0;
  }

  .overview-title-row {
    align-items: stretch;
    flex-direction: column;
  }

  .link-item {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
