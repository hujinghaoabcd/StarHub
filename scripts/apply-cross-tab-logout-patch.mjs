import { readFile, writeFile } from 'node:fs/promises'

const authPath = 'src/utils/auth.ts'
let authSource = await readFile(authPath, 'utf8')

const authBefore = `  window.addEventListener('storage', event => {
    if (event.key === AUTH_LOGOUT_EVENT_KEY) {
      AuthToken.clean({ notify: false })
    }
  })`

const authAfter = `  window.addEventListener('storage', event => {
    if (event.key === AUTH_LOGOUT_EVENT_KEY && event.newValue) {
      AuthToken.clean({ notify: false })
      window.location.replace(
        \`${'${import.meta.env.BASE_URL}'}#/login?reason=logged-out\`
      )
    }
  })`

if (authSource.includes(authBefore)) {
  authSource = authSource.replace(authBefore, authAfter)
} else if (!authSource.includes('reason=logged-out')) {
  throw new Error('Could not locate auth storage event listener')
}
await writeFile(authPath, authSource)

const loginPath = 'src/pages/Login.vue'
let loginSource = await readFile(loginPath, 'utf8')

const loginBefore = `    } else if (reason === 'unauthorized') {
      error.value = currentLanguage.value === 'zh'
        ? 'GitHub 已拒绝当前凭据，请重新授权。'
        : 'GitHub rejected the current credentials. Please authorize again.'
    }
    return`

const loginAfter = `    } else if (reason === 'unauthorized') {
      error.value = currentLanguage.value === 'zh'
        ? 'GitHub 已拒绝当前凭据，请重新授权。'
        : 'GitHub rejected the current credentials. Please authorize again.'
    } else if (reason === 'logged-out') {
      error.value = currentLanguage.value === 'zh'
        ? '登录已在另一个标签页退出。'
        : 'You signed out in another tab.'
    }
    return`

if (loginSource.includes(loginBefore)) {
  loginSource = loginSource.replace(loginBefore, loginAfter)
} else if (!loginSource.includes("reason === 'logged-out'")) {
  throw new Error('Could not locate login reason messages')
}
await writeFile(loginPath, loginSource)

console.log('Applied cross-tab logout behavior.')
