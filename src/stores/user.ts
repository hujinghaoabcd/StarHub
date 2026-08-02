import { defineStore } from 'pinia'
import type { User } from '@/types'

const STORAGE_KEY = 'starhub_user'

function getStorage(type: 'sessionStorage' | 'localStorage'): Storage | null {
  if (typeof window === 'undefined') return null

  try {
    return window[type]
  } catch {
    return null
  }
}

function readSavedUser(): User | null {
  const sessionStorage = getStorage('sessionStorage')
  const persistentStorage = getStorage('localStorage')

  let savedUser: string | null = null
  try {
    savedUser = sessionStorage?.getItem(STORAGE_KEY) || null
  } catch {
    savedUser = null
  }

  if (!savedUser) {
    try {
      savedUser = persistentStorage?.getItem(STORAGE_KEY) || null
      if (savedUser) {
        sessionStorage?.setItem(STORAGE_KEY, savedUser)
      }
      persistentStorage?.removeItem(STORAGE_KEY)
    } catch {
      // Continue with an in-memory profile when browser storage is blocked.
    }
  }

  if (!savedUser) return null

  try {
    return JSON.parse(savedUser) as User
  } catch (error) {
    console.error('Failed to parse saved user:', error)
    try {
      sessionStorage?.removeItem(STORAGE_KEY)
      persistentStorage?.removeItem(STORAGE_KEY)
    } catch {
      // Invalid cached data is already ignored in memory.
    }
    return null
  }
}

function persistUser(user: User | null) {
  const sessionStorage = getStorage('sessionStorage')
  const persistentStorage = getStorage('localStorage')

  try {
    persistentStorage?.removeItem(STORAGE_KEY)
    if (user) {
      sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      sessionStorage?.removeItem(STORAGE_KEY)
    }
  } catch {
    // Pinia state remains authoritative for the current page lifecycle.
  }
}

export const useUserStore = defineStore('user', {
  state: (): { user: User | null } => ({
    user: readSavedUser()
  }),

  getters: {
    isAuthenticated: state => Boolean(state.user),
    userName: state => state.user?.login || ''
  },

  actions: {
    setUser(user: User) {
      this.$state.user = user
      persistUser(user)
    },

    clearUser() {
      this.$state.user = null
      persistUser(null)
    }
  }
})
