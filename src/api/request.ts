import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { AuthToken } from '@/utils/auth'

const http: AxiosInstance = axios.create({
  baseURL: 'https://api.github.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github.v3+json'
  }
})

let authRedirectPending = false

function redirectToLogin(reason: 'session-expired' | 'unauthorized') {
  if (authRedirectPending || typeof window === 'undefined') return

  authRedirectPending = true
  AuthToken.clean()
  const loginUrl = `${import.meta.env.BASE_URL}#/login?reason=${reason}`
  window.location.replace(loginUrl)
}

http.interceptors.request.use(
  config => {
    const token = AuthToken.getGithubToken()
    if (!token) {
      redirectToLogin('session-expired')
      const error = new Error('GitHub authentication session has expired')
      error.name = 'AuthSessionExpiredError'
      return Promise.reject(error)
    }

    config.headers.Authorization = token
    return config
  },
  error => Promise.reject(error)
)

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  error => {
    if (error.response?.status === 401) {
      redirectToLogin('unauthorized')
    }
    return Promise.reject(error)
  }
)

export default http
