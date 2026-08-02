import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const typescriptModule = await import('typescript')
const ts = typescriptModule.default || typescriptModule
const source = await readFile(
  new URL('../src/utils/auth.ts', import.meta.url),
  'utf8'
)
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022
  }
}).outputText
const auth = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`
)

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial))
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }

  removeItem(key) {
    this.values.delete(key)
  }
}

test('new tokens are stored in session storage and removed from persistent storage', () => {
  const sessionStorage = new MemoryStorage()
  const persistentStorage = new MemoryStorage({
    'github-token': 'legacy-token',
    'app-token': 'legacy-app-token'
  })
  const manager = auth.createAuthTokenManager({
    sessionStorage,
    persistentStorage,
    now: () => 1000
  })

  manager.setGithubToken('Bearer current-token')

  assert.equal(manager.getGithubToken(), 'Bearer current-token')
  assert.equal(persistentStorage.getItem('github-token'), null)
  assert.equal(persistentStorage.getItem('app-token'), null)
  assert.equal(sessionStorage.values.size, 1)
})

test('legacy localStorage token migrates once into the session', () => {
  const sessionStorage = new MemoryStorage()
  const persistentStorage = new MemoryStorage({
    'github-token': 'Bearer legacy-token'
  })
  const manager = auth.createAuthTokenManager({
    sessionStorage,
    persistentStorage,
    now: () => 2000
  })

  assert.equal(manager.getGithubToken(), 'Bearer legacy-token')
  assert.equal(persistentStorage.getItem('github-token'), null)
  assert.equal(sessionStorage.values.size, 1)
})

test('expired sessions are rejected and removed', () => {
  const sessionStorage = new MemoryStorage()
  let timestamp = 0
  const manager = auth.createAuthTokenManager({
    sessionStorage,
    persistentStorage: new MemoryStorage(),
    now: () => timestamp,
    maxAgeMs: 100
  })

  manager.setGithubToken('Bearer expiring-token')
  timestamp = 100

  assert.equal(manager.exist(), false)
  assert.equal(manager.getGithubToken(), null)
  assert.equal(sessionStorage.values.size, 0)
})

test('clean removes all credentials and sends one logout notification', () => {
  const sessionStorage = new MemoryStorage()
  const persistentStorage = new MemoryStorage()
  let notifications = 0
  const manager = auth.createAuthTokenManager({
    sessionStorage,
    persistentStorage,
    now: () => 3000,
    onLogout: () => notifications++
  })

  manager.setGithubToken('Bearer token')
  manager.clean()

  assert.equal(manager.exist(), false)
  assert.equal(sessionStorage.values.size, 0)
  assert.equal(notifications, 1)

  manager.clean({ notify: false })
  assert.equal(notifications, 1)
})

test('blocked storage falls back to an in-memory session', () => {
  const blockedStorage = {
    getItem() {
      throw new Error('blocked')
    },
    setItem() {
      throw new Error('blocked')
    },
    removeItem() {
      throw new Error('blocked')
    }
  }
  const manager = auth.createAuthTokenManager({
    sessionStorage: blockedStorage,
    persistentStorage: blockedStorage,
    now: () => 4000
  })

  manager.setGithubToken('Bearer memory-token')
  assert.equal(manager.getGithubToken(), 'Bearer memory-token')
})

test('session metadata exposes the hard expiry without exposing the token', () => {
  const manager = auth.createAuthTokenManager({
    sessionStorage: new MemoryStorage(),
    persistentStorage: new MemoryStorage(),
    now: () => 5000,
    maxAgeMs: 2000
  })

  manager.setGithubToken('Bearer token')
  assert.deepEqual(manager.getSessionInfo(), {
    createdAt: 5000,
    lastUsedAt: 5000,
    expiresAt: 7000
  })
})
