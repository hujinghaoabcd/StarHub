import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('README requests abort and ignore stale repository responses', async () => {
  const detail = await source('src/pages/Home/components/DetailView.vue')

  assert.match(detail, /readmeController\?\.abort\(\)/)
  assert.match(detail, /getReadme\(owner, repo, controller\.signal\)/)
  assert.match(detail, /requestId !== readmeRequestId/)
  assert.match(detail, /readmeLoading/)
  assert.match(detail, /readmeError/)
  assert.match(detail, /onUnmounted/)
  assert.doesNotMatch(detail, /watch\(\(\) => themeStore\.theme/)
})

test('repository sync cancellation aborts active GitHub requests', async () => {
  const api = await source('src/api/github.ts')
  const store = await source('src/stores/repo.ts')

  assert.match(api, /getLoginUserStarred\([\s\S]*signal\?: AbortSignal/)
  assert.match(store, /const syncController = new AbortController\(\)/)
  assert.match(store, /getLoginUserStarred\([\s\S]*syncController\.signal/)
  assert.match(store, /activeRepositorySyncController\?\.abort\(\)/)
  assert.match(store, /syncController\.signal\.aborted/)
})

test('batch selection is restricted to visible repositories', async () => {
  const repoList = await source('src/pages/Home/components/RepoList.vue')

  assert.match(repoList, /\{\{ selectedRepos\.size \}\} \/ \{\{ repos\.length \}\}/)
  assert.match(repoList, /visibleIdSet/)
  assert.match(repoList, /filter\(repoId => visibleIdSet\.has\(repoId\)\)/)
  assert.match(repoList, /replaceTagsForRepo/)
  assert.match(repoList, /失败项目已保留选中/)
})

test('layout keeps sessions on transient errors and honors the Pages base path', async () => {
  const layout = await source('src/layouts/HomeLayout.vue')
  const home = await source('src/pages/Home/index.vue')

  assert.match(layout, /status === 401[\s\S]*AuthToken\.clean\(\)/)
  assert.match(layout, /登录状态已保留/)
  assert.match(layout, /import\.meta\.env\.BASE_URL/)
  assert.match(layout, /onUnmounted\(stopResize\)/)
  assert.match(home, /onUnmounted\(stopContentResize\)/)
})

test('login page uses i18n and does not advertise unimplemented guarantees', async () => {
  const [login, zhLocale, enLocale] = await Promise.all([
    source('src/pages/Login.vue'),
    source('src/i18n/locales/zh.ts'),
    source('src/i18n/locales/en.ts')
  ])

  assert.match(login, /t\('login\.heroDescription'\)/)
  assert.match(login, /t\('login\.governanceDescription'\)/)
  assert.match(login, /t\('login\.networkError'\)/)
  assert.match(zhLocale, /localFirst: '本地优先'/)
  assert.match(enLocale, /localFirst: 'Local first'/)
  assert.doesNotMatch(login, /PWA|离线可用|Offline Ready/)
  assert.doesNotMatch(login, /18 种预设分类|18 presets/)
  assert.doesNotMatch(login, /10,000\+|10000\+|<10ms|10ms/)
  assert.doesNotMatch(login, /2024 technologies|2024 年最新/)
})
