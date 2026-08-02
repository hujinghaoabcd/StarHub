import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/pages/Login.vue'
let source = await readFile(path, 'utf8')

const before = `  if (!code) {
    return
  }`

const after = `  if (!code) {
    const reason = typeof route.query.reason === 'string'
      ? route.query.reason
      : ''

    if (reason === 'session-expired') {
      error.value = currentLanguage.value === 'zh'
        ? '登录会话已过期，请重新使用 GitHub 登录。'
        : 'Your login session expired. Please sign in with GitHub again.'
    } else if (reason === 'unauthorized') {
      error.value = currentLanguage.value === 'zh'
        ? 'GitHub 已拒绝当前凭据，请重新授权。'
        : 'GitHub rejected the current credentials. Please authorize again.'
    }
    return
  }`

if (source.includes(before)) {
  source = source.replace(before, after)
} else if (!source.includes("reason === 'session-expired'")) {
  throw new Error('Could not locate OAuth callback empty-code branch')
}

await writeFile(path, source)
console.log('Applied login session expiry messages.')
