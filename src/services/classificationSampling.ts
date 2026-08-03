import type {
  ClassificationTaskSelectionMode,
  Repository
} from '@/types'

export type ClassificationSampleSize = 100 | 200 | 500 | 'all'

export interface ClassificationSampleOptions {
  size: ClassificationSampleSize
  random: boolean
  seed: number
}

export interface ClassificationSampleResult {
  repositories: Repository[]
  selectionMode: ClassificationTaskSelectionMode
  sampleSeed?: number
}

function stableHash(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function selectClassificationSample(
  repositories: readonly Repository[],
  options: ClassificationSampleOptions
): ClassificationSampleResult {
  if (options.size === 'all') {
    return {
      repositories: [...repositories],
      selectionMode: 'all'
    }
  }

  const size = Math.min(repositories.length, options.size)
  if (!options.random) {
    return {
      repositories: repositories.slice(0, size),
      selectionMode: 'ordered'
    }
  }

  const seed = Math.max(0, Math.trunc(options.seed))
  const sampled = repositories
    .map(repository => ({
      repository,
      score: stableHash(`${seed}:${repository.id}`)
    }))
    .sort((left, right) =>
      left.score - right.score || left.repository.id - right.repository.id
    )
    .slice(0, size)
    .map(candidate => candidate.repository)

  return {
    repositories: sampled,
    selectionMode: 'random',
    sampleSeed: seed
  }
}
