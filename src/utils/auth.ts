const LEGACY_APP_TOKEN_KEY = 'app-token'
const LEGACY_GITHUB_TOKEN_KEY = 'github-token'
const USER_PROFILE_KEY = 'starhub_user'
const AUTH_SESSION_KEY = 'starhub-auth-session-v1'
const AUTH_LOGOUT_EVENT_KEY = 'starhub-auth-logout'

export const AUTH_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000
const TOUCH_INTERVAL_MS = 5 * 60 * 1000

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface AuthSession {
  version: 1
  authorization: string
  createdAt: number
  lastUsedAt: number
}

export interface AuthSessionInfo {
  createdAt: number
  lastUsedAt: number
  expiresAt: number
}

export interface AuthTokenManagerOptions {
  sessionStorage?: StorageLike | null
  persistentStorage?: StorageLike | null
  now?: () => number
  maxAgeMs?: number
  onLogout?: () => void
}

function safeGet(storage: StorageLike | null, key: string): string | null {
  try {
    return storage?.getItem(key) || null
  } catch {
    return null
  }
}

function safeSet(storage: StorageLike | null, key: string, value: string): void {
  try {
    storage?.setItem(key, value)
  } catch {
    // The in-memory copy remains available for the current page lifecycle.
  }
}

function safeRemove(storage: StorageLike | null, key: string): void {
  try {
    storage?.removeItem(key)
  } catch {
    // Storage cleanup is best-effort when the browser blocks storage access.
  }
}

function parseSession(value: string | null): AuthSession | null {
  if (!value) return null

  try {
    const session = JSON.parse(value) as Partial<AuthSession>
    if (
      session.version !== 1 ||
      typeof session.authorization !== 'string' ||
      !session.authorization.trim() ||
      typeof session.createdAt !== 'number' ||
      !Number.isFinite(session.createdAt) ||
      typeof session.lastUsedAt !== 'number' ||
      !Number.isFinite(session.lastUsedAt)
    ) {
      return null
    }

    return {
      version: 1,
      authorization: session.authorization.trim(),
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt
    }
  } catch {
    return null
  }
}

function isSessionValid(
  session: AuthSession,
  now: number,
  maxAgeMs: number
): boolean {
  if (session.createdAt > now + 60_000) return false
  return now - session.createdAt < maxAgeMs
}

export function createAuthTokenManager(config: AuthTokenManagerOptions = {}) {
  const sessionStorage = config.sessionStorage ?? null
  const persistentStorage = config.persistentStorage ?? null
  const now = config.now || Date.now
  const maxAgeMs = config.maxAgeMs ?? AUTH_SESSION_MAX_AGE_MS
  let memorySession: AuthSession | null = null

  const persistSession = (session: AuthSession) => {
    memorySession = session
    safeSet(sessionStorage, AUTH_SESSION_KEY, JSON.stringify(session))
  }

  const removeStoredCredentials = () => {
    memorySession = null
    safeRemove(sessionStorage, AUTH_SESSION_KEY)
    safeRemove(sessionStorage, LEGACY_APP_TOKEN_KEY)
    safeRemove(sessionStorage, LEGACY_GITHUB_TOKEN_KEY)
    safeRemove(sessionStorage, USER_PROFILE_KEY)
    safeRemove(persistentStorage, LEGACY_APP_TOKEN_KEY)
    safeRemove(persistentStorage, LEGACY_GITHUB_TOKEN_KEY)
    safeRemove(persistentStorage, USER_PROFILE_KEY)
  }

  const migrateLegacyToken = (): AuthSession | null => {
    const legacyToken = safeGet(persistentStorage, LEGACY_GITHUB_TOKEN_KEY)?.trim()
    safeRemove(persistentStorage, LEGACY_APP_TOKEN_KEY)
    safeRemove(persistentStorage, LEGACY_GITHUB_TOKEN_KEY)

    if (!legacyToken) return null

    const timestamp = now()
    const session: AuthSession = {
      version: 1,
      authorization: legacyToken,
      createdAt: timestamp,
      lastUsedAt: timestamp
    }
    persistSession(session)
    return session
  }

  const readSession = (): AuthSession | null => {
    const timestamp = now()
    let session = memorySession

    if (!session) {
      session = parseSession(safeGet(sessionStorage, AUTH_SESSION_KEY))
    }
    if (!session) {
      session = migrateLegacyToken()
    }
    if (!session || !isSessionValid(session, timestamp, maxAgeMs)) {
      removeStoredCredentials()
      return null
    }

    if (timestamp - session.lastUsedAt >= TOUCH_INTERVAL_MS) {
      session = { ...session, lastUsedAt: timestamp }
      persistSession(session)
    } else {
      memorySession = session
    }

    return session
  }

  return {
    getAppToken(): string | null {
      return this.getGithubToken()
    },

    getGithubToken(): string | null {
      return readSession()?.authorization || null
    },

    setGithubToken(githubToken: string): void {
      const authorization = githubToken.trim()
      if (!authorization) {
        throw new TypeError('GitHub authorization token cannot be empty')
      }

      const timestamp = now()
      persistSession({
        version: 1,
        authorization,
        createdAt: timestamp,
        lastUsedAt: timestamp
      })
      safeRemove(persistentStorage, LEGACY_APP_TOKEN_KEY)
      safeRemove(persistentStorage, LEGACY_GITHUB_TOKEN_KEY)
    },

    setToken(_appToken: string, githubToken: string): void {
      this.setGithubToken(githubToken)
    },

    getSessionInfo(): AuthSessionInfo | null {
      const session = readSession()
      if (!session) return null

      return {
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.createdAt + maxAgeMs
      }
    },

    clean(cleanOptions: { notify?: boolean } = {}): void {
      removeStoredCredentials()
      if (cleanOptions.notify !== false) {
        config.onLogout?.()
      }
    },

    exist(): boolean {
      return Boolean(readSession())
    }
  }
}

function getBrowserStorage(type: 'sessionStorage' | 'localStorage'): StorageLike | null {
  if (typeof window === 'undefined') return null

  try {
    return window[type]
  } catch {
    return null
  }
}

const browserSessionStorage = getBrowserStorage('sessionStorage')
const browserPersistentStorage = getBrowserStorage('localStorage')

function broadcastLogout() {
  if (!browserPersistentStorage) return

  try {
    browserPersistentStorage.setItem(AUTH_LOGOUT_EVENT_KEY, String(Date.now()))
    browserPersistentStorage.removeItem(AUTH_LOGOUT_EVENT_KEY)
  } catch {
    // Cross-tab notification is optional; local cleanup already succeeded.
  }
}

export const AuthToken = createAuthTokenManager({
  sessionStorage: browserSessionStorage,
  persistentStorage: browserPersistentStorage,
  onLogout: broadcastLogout
})

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === AUTH_LOGOUT_EVENT_KEY && event.newValue) {
      AuthToken.clean({ notify: false })
      window.location.replace(
        `${import.meta.env.BASE_URL}#/login?reason=logged-out`
      )
    }
  })
}
