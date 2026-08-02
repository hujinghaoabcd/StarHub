import axios, { type AxiosResponse } from 'axios'
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
  getReadme(owner: string, repo: string): Promise<AxiosResponse<string>> {
    return http.get(`/repos/${owner}/${repo}/readme`, {
      headers: {
        Accept: 'application/vnd.github.VERSION.raw'
      }
    })
  },

  // Get repository details, including About homepage and Pages availability
  getRepository(owner: string, repo: string): Promise<AxiosResponse<Repository>> {
    return http.get(`/repos/${owner}/${repo}`)
  },

  // Public Pages metadata does not need the user's OAuth token.
  getRepositoryPages(
    owner: string,
    repo: string
  ): Promise<AxiosResponse<RepositoryPagesSite>> {
    return publicGithubHttp.get(`/repos/${owner}/${repo}/pages`)
  },

  // Remove a star for the authenticated user
  unstarRepository(owner: string, repo: string): Promise<AxiosResponse<void>> {
    return http.delete(`/user/starred/${owner}/${repo}`)
  }
}
