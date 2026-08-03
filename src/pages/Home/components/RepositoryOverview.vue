<template>
  <section class="repository-overview" aria-label="Repository links and actions">
    <div class="link-list">
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

    <div class="action-column">
      <el-button
        type="danger"
        plain
        size="small"
        :loading="unstarLoading"
        :disabled="repo.private"
        @click="handleUnstar"
      >
        取消 Star
      </el-button>
      <span v-if="repo.private" class="permission-note">
        未申请私有仓库 repo 权限
      </span>
      <span v-else class="permission-note">
        首次使用时按需申请 public_repo
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { githubApi } from '@/api/github'
import {
  authorizeGitHubScopes,
  currentTokenHasScope,
  OAuthPermissionError
} from '@/services/oauthPermission'
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

    if (!detailsResponse.data.has_pages) return

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

function permissionErrorMessage(error: OAuthPermissionError): string {
  switch (error.code) {
    case 'popup_blocked':
      return '浏览器阻止了 GitHub 授权窗口，请允许弹出窗口后重试。'
    case 'popup_closed':
      return '授权窗口已关闭，未修改当前 GitHub 权限。'
    case 'authorization_denied':
      return '你取消了 GitHub 权限授权，仓库仍保持 Star。'
    case 'authorization_timeout':
      return 'GitHub 授权超时，请重新操作。'
    case 'scope_not_granted':
      return 'GitHub 未授予 public_repo 权限，无法在应用内取消 Star。'
    case 'invalid_callback':
    default:
      return 'GitHub 权限授权失败，请稍后重试。'
  }
}

async function requestPublicRepoPermission(): Promise<boolean> {
  try {
    await ElMessageBox.confirm(
      'GitHub OAuth App 没有“仅修改 Star”的独立作用域。取消公开仓库的 Star 需要 public_repo，它同时允许对公开仓库执行更广泛的读写操作。StarHub 只会在此功能中调用取消 Star 接口，且不会申请私有仓库 repo 权限。是否继续授权？',
      '需要公开仓库权限',
      {
        confirmButtonText: '前往 GitHub 授权',
        cancelButtonText: '取消',
        type: 'warning',
        distinguishCancelAndClose: true
      }
    )
  } catch {
    return false
  }

  try {
    await authorizeGitHubScopes(['read:user', 'public_repo'])
    ElMessage.success('公开仓库 Star 操作权限已更新')
    return true
  } catch (error) {
    if (error instanceof OAuthPermissionError) {
      ElMessage.error(permissionErrorMessage(error))
    } else {
      ElMessage.error('GitHub 权限授权失败，请稍后重试。')
    }
    return false
  }
}

async function unstarWithRequiredPermission(): Promise<boolean> {
  let permissionUpgraded = false

  try {
    const hasPermission = await currentTokenHasScope('public_repo')
    if (hasPermission === false) {
      permissionUpgraded = await requestPublicRepoPermission()
      if (!permissionUpgraded) return false
    }
  } catch (error) {
    console.warn('Could not inspect current GitHub OAuth scopes:', error)
  }

  try {
    await repoStore.unstarRepository(props.repo)
    return true
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status : undefined

    if (status === 403 && !permissionUpgraded) {
      const granted = await requestPublicRepoPermission()
      if (!granted) return false

      await repoStore.unstarRepository(props.repo)
      return true
    }

    throw error
  }
}

async function handleUnstar() {
  try {
    await ElMessageBox.confirm(
      `确定取消 ${props.repo.full_name} 的 Star 吗？远端成功后，该项目也会从本地列表和标签关系中移除。`,
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

  if (repoStore.isSyncing) {
    repoStore.cancelRepositorySync(
      'Repository sync was cancelled before removing a star.'
    )
    ElMessage.info('已暂停后台同步，正在取消 Star。')
  }

  unstarLoading.value = true

  try {
    const completed = await unstarWithRequiredPermission()
    if (!completed) return

    ElMessage.success(`已取消 ${props.repo.full_name} 的 Star`)
    emit('unstarred', props.repo.id)
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status : undefined

    if (status === 404) {
      ElMessage.error('仓库不存在、已不可访问，或当前账户无权操作。')
    } else if (
      error instanceof Error &&
      error.message === 'remote_unstar_succeeded_local_refresh_failed'
    ) {
      ElMessage.warning('GitHub 已取消 Star，但本地刷新失败；请刷新页面重新同步。')
    } else {
      ElMessage.error('取消 Star 失败，仓库仍保留在当前列表中。')
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.link-list {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 7px;
}

.link-item {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 10px;
  align-items: baseline;
  font-size: 0.8rem;
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

.link-empty,
.permission-note {
  color: var(--text-tertiary);
}

.action-column {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  flex-shrink: 0;
  gap: 6px;
}

.permission-note {
  max-width: 190px;
  font-size: 0.7rem;
  line-height: 1.35;
  text-align: right;
}

@media (max-width: 768px) {
  .repository-overview {
    align-items: stretch;
    flex-direction: column;
  }

  .link-item {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .action-column {
    align-items: flex-start;
  }

  .permission-note {
    max-width: none;
    text-align: left;
  }
}
</style>
