import type {
  ClassificationCategory,
  ClassificationUsageEstimate,
  Repository
} from '@/types'

/** Bump whenever the model-facing instructions or metadata contract changes. */
export const CLASSIFICATION_PROMPT_VERSION = '2026-08-03-c1'

export function buildRepositoryClassificationMetadata(repository: Repository) {
  return {
    repository_id: repository.id,
    name: repository.name,
    full_name: repository.full_name,
    description: repository.description || '',
    language: repository.language || '',
    topics: repository.topics || []
  }
}

export function estimateClassificationUsage(
  repositories: readonly Repository[],
  categories: readonly ClassificationCategory[],
  requestedBatchSize: number
): ClassificationUsageEstimate {
  const batchSize = Math.min(100, Math.max(1, Math.trunc(requestedBatchSize)))
  const batchCount = Math.ceil(repositories.length / batchSize)
  const registryCharacters = JSON.stringify(categories.map(category => ({
    category_id: category.categoryId,
    name: category.name,
    aliases: category.aliases || [],
    description: category.description,
    examples: category.examples,
    exclusions: category.exclusions
  }))).length
  const repositoryCharacters = repositories.reduce(
    (total, repository) =>
      total + JSON.stringify(buildRepositoryClassificationMetadata(repository)).length,
    0
  )

  // Two characters per token is deliberately cautious for mixed Chinese,
  // English and JSON. The fixed prompt allowance is repeated for every batch.
  const estimatedInputTokens = Math.ceil(
    (repositoryCharacters + batchCount * (registryCharacters + 1_200)) / 2
  )
  let estimatedOutputTokens = 0
  for (let start = 0; start < repositories.length; start += batchSize) {
    const repositoryCount = Math.min(batchSize, repositories.length - start)
    estimatedOutputTokens += Math.min(
      8_000,
      Math.max(1_500, repositoryCount * 160)
    )
  }

  return {
    repositoryCount: repositories.length,
    batchCount,
    estimatedInputTokens,
    estimatedOutputTokens
  }
}
