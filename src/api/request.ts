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

http.interceptors.request.use(
  (config) => {
    const token = AuthToken.getGithubToken()
    if (token) {
      config.headers.Authorization = token
    }
    return config
  },
  (error) => Promise.reject(error)
)

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      AuthToken.clean()
      window.location.href = `${import.meta.env.BASE_URL}#/login`
    }
    return Promise.reject(error)
  }
)

export default http
