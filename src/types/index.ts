export interface User {
  id: number
  login: string
  name?: string
  avatar_url: string
  bio?: string
  html_url: string
  public_repos: number
  followers: number
  following: number
}

export interface Repository {
  id: number
  name: string
  full_name: string
  description?: string
  html_url: string
  language?: string
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  updated_at: string
  created_at: string
  pushed_at: string
  default_branch?: string
  owner: {
    login: string
    avatar_url: string
    html_url: string
  }
  topics?: string[]
  license?: {
    name: string
    spdx_id: string
  }
  archived: boolean
  disabled: boolean
  private: boolean
}

export interface StoredTag {
  id: string
  name: string
  color: string
  emoji?: string
  createdAt: number
  updatedAt: number
}

/**
 * UI-facing tag view. Repository membership is derived from repoTags and is
 * never persisted inside the tags table.
 */
export interface Tag extends StoredTag {
  repos: number[]
}

export interface RepoTag {
  repoId: number
  tagId: string
}

export interface PaginationInfo {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface ApiResponse<T> {
  data: T
  status: number
  headers?: Record<string, string>
}

export type Theme = 'light' | 'dark'
export type Language = 'zh' | 'en'
