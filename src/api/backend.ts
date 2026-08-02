
import axios, { AxiosInstance } from 'axios'
import { GITHUB_OAUTH_CONFIG } from '@/config/oauth'

const backendHttp: AxiosInstance = axios.create({
  baseURL: GITHUB_OAUTH_CONFIG.API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export default backendHttp
