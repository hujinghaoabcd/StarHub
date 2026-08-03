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
  homepage?: string
  has_pages?: boolean
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

export interface RepositoryPagesSite {
  status?: string
  cname?: string | null
  html_url: string
  public?: boolean
  https_enforced?: boolean
  source?: {
    branch: string
    path: string
  }
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

export interface ClassificationCategory {
  categoryId: string
  name: string
  description: string
  examples: string[]
  exclusions: string[]
}

export interface ClassificationAssignment {
  repositoryId: number
  categoryId: string
  confidence: number
  reason: string
}

export interface ClassificationReviewItem extends ClassificationAssignment {
  repositoryName: string
  categoryName: string
}

export interface ClassificationCommitReceipt {
  id: string
  createdAt: number
  addedRelations: RepoTag[]
}

export type ClassificationTaskStatus =
  | 'running'
  | 'paused'
  | 'partial'
  | 'completed'
  | 'cancelled'

export type ClassificationTaskItemStatus = 'pending' | 'success' | 'failed'

export interface ClassificationTask {
  id: string
  status: ClassificationTaskStatus
  provider: 'openai' | 'claude' | 'qwen' | 'zhipu' | 'deepseek'
  model: string
  batchSize: number
  registryVersion: string
  promptVersion: string
  totalCount: number
  processedCount: number
  successCount: number
  failedCount: number
  acceptedCount: number
  estimatedBatches: number
  estimatedInputTokens: number
  estimatedOutputTokens: number
  createdAt: number
  updatedAt: number
  lastError?: string
  committedAt?: number
  committedCount?: number
}

export interface ClassificationTaskItem {
  taskId: string
  repositoryId: number
  status: ClassificationTaskItemStatus
  categoryId?: string
  confidence?: number
  reason?: string
  error?: string
  attempts: number
  /** IndexedDB-compatible boolean: 1 is accepted, 0 is not accepted. */
  accepted: 0 | 1
  updatedAt: number
}

export interface ClassificationUsageEstimate {
  repositoryCount: number
  batchCount: number
  estimatedInputTokens: number
  estimatedOutputTokens: number
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
