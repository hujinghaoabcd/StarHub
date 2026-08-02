import { AuthToken } from '@/utils/auth'

const SESSION_CHECK_INTERVAL_MS = 60 * 1000
let sessionCheckTimer: number | null = null

function isLoginRoute(): boolean {
  return window.location.hash.startsWith('#/login')
}

function isOAuthCallback(): boolean {
  return new URLSearchParams(window.location.search).has('code')
}

function redirectExpiredSession() {
  if (isLoginRoute() || isOAuthCallback()) return
  if (AuthToken.exist()) return

  window.location.replace(
    `${import.meta.env.BASE_URL}#/login?reason=session-expired`
  )
}

export function startAuthSessionLifecycle(): void {
  if (typeof window === 'undefined' || sessionCheckTimer !== null) return

  const checkSession = () => redirectExpiredSession()
  sessionCheckTimer = window.setInterval(checkSession, SESSION_CHECK_INTERVAL_MS)

  window.addEventListener('focus', checkSession)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkSession()
    }
  })
}
