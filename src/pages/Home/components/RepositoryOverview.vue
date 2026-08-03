<template>
  <el-button
    class="unstar-button"
    :loading="unstarLoading"
    :disabled="repo.private"
    @click="handleUnstar"
  >
    <el-icon v-if="!unstarLoading"><Star /></el-icon>
    <span>取消 Star</span>
  </el-button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { isAxiosError } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Star } from '@element-plus/icons-vue'
import {
  authorizeGitHubScopes,
  currentTokenHasScope,
  OAuthPermissionError
} from '@/services/oauthPermission'
import { useRepoStore } from '@/stores/repo'
import type { Repository } from '@/types'

const props = defineProps<{
  repo: Repository
}>()

const emit = defineEmits<{
  unstarred: [repoId: number]
}>()

const repoStore = useRepoStore()
const unstarLoading = ref(false)

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
</script>

<style lang="scss" scoped>
.unstar-button {
  height: 28px;
  padding: 0 8px;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
  background: var(--el-color-danger);
  border: 1px solid var(--el-color-danger);
  border-radius: 3px;

  :deep(.el-icon) {
    font-size: 0.76rem;
  }

  &:hover,
  &:focus-visible {
    color: #fff;
    background: var(--el-color-danger-dark-2);
    border-color: var(--el-color-danger-dark-2);
  }

  &.is-disabled {
    color: var(--text-tertiary);
    background: var(--bg-tertiary);
    border-color: var(--border);
  }
}
</style>
