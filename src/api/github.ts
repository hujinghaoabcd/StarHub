import axios, { isAxiosError, type AxiosResponse } from 'axios'
import qs from 'query-string'
import http from './request'
import type { User, Repository, RepositoryPagesSite } from '@/types'

const publicGithubHttp = axios.create({
  baseURL: 'https://api.github.com',
  timeout: 30000,
  headers: {
    Accept: 'application/vnd.github+json'
  }
})

export const githubApi = {
  // Get authenticated user
  getLoginUser(): Promise<AxiosResponse<User>> {
    return http.get('/user')
  },

  // Get user by username
  getUser(userName: string): Promise<AxiosResponse<User>> {
    return http.get(`/users/${userName}`)
  },

  // Get starred repositories for authenticated user
  getLoginUserStarred(
    perPage: number = 40,
    page: number = 1
  ): Promise<AxiosResponse<Repository[]>> {
    return http.get(
      `/user/starred?${qs.stringify({ per_page: perPage, page })}`
    )
  },

  // Get starred repositories for a user
  getUserStarred(
    userName: string,
    perPage: number = 40,
    page: number = 1
  ): Promise<AxiosResponse<Repository[]>> {
    return http.get(
      `/users/${userName}/starred?${qs.stringify({ per_page: perPage, page })}`
    )
  },

  // Get repository README
  getReadme(
    owner: string,
    repo: string,
    signal?: AbortSignal
  ): Promise<AxiosResponse<string>> {
    return http.get(`/repos/${owner}/${repo}/readme`, {
      signal,
      headers: {
        Accept: 'application/vnd.github.VERSION.raw'
      }
    })
  },

  // Get repository details, including About homepage and Pages availability
  getRepository(owner: string, repo: string): Promise<AxiosResponse<Repository>> {
    return http.get(`/repos/${owner}/${repo}`)
  },

  // Prefer the authenticated rate limit. Public repositories can fall back to
  // an anonymous request when the current OAuth scope cannot read Pages data.
  async getRepositoryPages(
    owner: string,
    repo: string
  ): Promise<AxiosResponse<RepositoryPagesSite>> {
    try {
      return await http.get(`/repos/${owner}/${repo}/pages`)
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined
      if (status !== 403 && status !== 404) {
        throw error
      }

      return publicGithubHttp.get(`/repos/${owner}/${repo}/pages`)
    }
  },

  // Remove a star for the authenticated user
  unstarRepository(owner: string, repo: string): Promise<AxiosResponse<void>> {
    return http.delete(`/user/starred/${owner}/${repo}`)
  }
}
