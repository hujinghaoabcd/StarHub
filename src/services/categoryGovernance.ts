import { db } from '@/db'
import type {
  CategoryMigrationSnapshot,
  CategoryRegistryMetadata,
  RepoTag,
  StoredTag,
  Tag
} from '@/types'
import {
  createStableCategoryId,
  normalizeCategoryName,
  type CategoryRegistryDefinition
} from '@/services/categoryRegistryImport'
import { runDataMutation } from '@/services/dataMutationQueue'
import { deduplicateRepoTags, toStoredTag } from '@/services/tagRelations'

export type CategoryMigrationStatus =
  | 'create'
  | 'rename'
  | 'merge'
  | 'update'
  | 'unchanged'
  | 'conflict'

export interface CategoryMigrationOperation {
  definition: CategoryRegistryDefinition
  status: CategoryMigrationStatus
  targetTagId?: string
  sourceTagIds: string[]
  currentNames: string[]
  message: string
}

export interface CategoryMigrationPreview {
  operations: CategoryMigrationOperation[]
  counts: Record<CategoryMigrationStatus, number>
  hasConflicts: boolean
}

export interface CategoryMigrationResult {
  snapshotId: string
  created: number
  renamed: number
  merged: number
  updated: number
  unchanged: number
  relationCountBefore: number
  relationCountAfter: number
}

const CATEGORY_COLORS = [
  '#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#EA580C',
  '#CA8A04', '#65A30D', '#16A34A', '#059669', '#0D9488',
  '#0891B2', '#0284C7', '#4F46E5', '#9333EA', '#C026D3',
  '#E11D48', '#475569', '#0F766E', '#0369A1', '#4338CA',
  '#6D28D9', '#A21CAF', '#BE123C', '#B45309'
]

async function ensureDatabaseOpen() {
  if (!db.isOpen()) await db.open()
}

function tagSearchNames(tag: Tag): Set<string> {
  const values = [
    tag.name,
    tag.registry?.nameZh,
    tag.registry?.nameEn,
    ...(tag.registry?.aliases || [])
  ]
  return new Set(
    values
      .filter((value): value is string => Boolean(value))
      .map(normalizeCategoryName)
      .filter(Boolean)
  )
}

function definitionSearchNames(
  definition: CategoryRegistryDefinition
): Set<string> {
  return new Set(
    [definition.nameZh, definition.nameEn, ...definition.aliases]
      .map(normalizeCategoryName)
      .filter(Boolean)
  )
}

function metadataMatches(
  tag: Tag,
  definition: CategoryRegistryDefinition,
  sourceVersion: string
): boolean {
  const registry = tag.registry
  if (!registry) return false
  return registry.registryKey === definition.registryKey &&
    registry.sourceVersion === sourceVersion &&
    registry.nameZh === definition.nameZh &&
    registry.nameEn === definition.nameEn &&
    JSON.stringify(registry.aliases) === JSON.stringify(definition.aliases) &&
    registry.descriptionZh === definition.descriptionZh &&
    registry.descriptionEn === definition.descriptionEn &&
    JSON.stringify(registry.examples) === JSON.stringify(definition.examples) &&
    JSON.stringify(registry.exclusions) === JSON.stringify(definition.exclusions) &&
    registry.level1 === definition.level1 &&
    registry.level2 === definition.level2
}

function emptyCounts(): Record<CategoryMigrationStatus, number> {
  return {
    create: 0,
    rename: 0,
    merge: 0,
    update: 0,
    unchanged: 0,
    conflict: 0
  }
}

export function buildCategoryMigrationPreview(
  tags: readonly Tag[],
  definitions: readonly CategoryRegistryDefinition[],
  sourceVersion: string
): CategoryMigrationPreview {
  const tagNames = new Map(tags.map(tag => [tag.id, tagSearchNames(tag)]))
  const claimedTagIds = new Map<string, number[]>()
  const operations: CategoryMigrationOperation[] = definitions.map((definition, definitionIndex) => {
    const incomingNames = definitionSearchNames(definition)
    const exactRegistryTag = tags.find(
      tag => tag.registry?.registryKey === definition.registryKey
    )
    const matchingTags = tags.filter(tag => {
      if (tag.id === exactRegistryTag?.id) return true
      const names = tagNames.get(tag.id) || new Set<string>()
      return [...incomingNames].some(name => names.has(name))
    })

    matchingTags.forEach(tag => {
      const claims = claimedTagIds.get(tag.id) || []
      claims.push(definitionIndex)
      claimedTagIds.set(tag.id, claims)
    })

    const foreignManagedTag = matchingTags.find(
      tag => tag.registry && tag.registry.registryKey !== definition.registryKey
    )
    if (foreignManagedTag) {
      return {
        definition,
        status: 'conflict' as const,
        sourceTagIds: matchingTags.map(tag => tag.id),
        currentNames: matchingTags.map(tag => tag.name),
        message: `正式分类“${foreignManagedTag.name}”属于另一个 registryKey`
      }
    }
    if (matchingTags.length === 0) {
      const deterministicId = createStableCategoryId(definition.registryKey)
      const idCollision = tags.find(tag => tag.id === deterministicId)
      return idCollision
        ? {
            definition,
            status: 'conflict' as const,
            sourceTagIds: [idCollision.id],
            currentNames: [idCollision.name],
            message: `稳定分类 ID ${deterministicId} 已被其他分类占用`
          }
        : {
            definition,
            status: 'create' as const,
            sourceTagIds: [],
            currentNames: [],
            message: '创建新的正式分类'
          }
    }

    const targetTag = exactRegistryTag || [...matchingTags].sort(
      (left, right) => right.repos.length - left.repos.length
    )[0]
    const sourceTagIds = matchingTags
      .filter(tag => tag.id !== targetTag.id)
      .map(tag => tag.id)
    const currentNames = matchingTags.map(tag => tag.name)

    if (sourceTagIds.length > 0) {
      return {
        definition,
        status: 'merge' as const,
        targetTagId: targetTag.id,
        sourceTagIds,
        currentNames,
        message: `合并 ${sourceTagIds.length + 1} 个同义分类并保留全部项目关系`
      }
    }
    if (targetTag.name !== definition.nameZh) {
      return {
        definition,
        status: 'rename' as const,
        targetTagId: targetTag.id,
        sourceTagIds: [],
        currentNames,
        message: '安全重命名，分类 ID 保持不变'
      }
    }
    if (!metadataMatches(targetTag, definition, sourceVersion)) {
      return {
        definition,
        status: 'update' as const,
        targetTagId: targetTag.id,
        sourceTagIds: [],
        currentNames,
        message: '补充或更新正式注册表元数据'
      }
    }
    return {
      definition,
      status: 'unchanged' as const,
      targetTagId: targetTag.id,
      sourceTagIds: [],
      currentNames,
      message: '与当前正式注册表一致'
    }
  })

  for (const [tagId, definitionIndexes] of claimedTagIds) {
    if (new Set(definitionIndexes).size <= 1) continue
    for (const index of definitionIndexes) {
      operations[index] = {
        ...operations[index],
        status: 'conflict',
        message: `现有分类 ${tagId} 同时匹配多个导入分类`
      }
    }
  }

  const counts = emptyCounts()
  operations.forEach(operation => counts[operation.status]++)
  return {
    operations,
    counts,
    hasConflicts: counts.conflict > 0
  }
}

function registryMetadata(
  definition: CategoryRegistryDefinition,
  sourceVersion: string
): CategoryRegistryMetadata {
  return {
    schemaVersion: 2,
    managed: true,
    registryKey: definition.registryKey,
    sourceVersion,
    nameZh: definition.nameZh,
    nameEn: definition.nameEn,
    aliases: [...definition.aliases],
    descriptionZh: definition.descriptionZh,
    descriptionEn: definition.descriptionEn,
    examples: [...definition.examples],
    exclusions: [...definition.exclusions],
    level1: definition.level1,
    level2: definition.level2
  }
}

function hueColor(index: number): string {
  const hue = (index * 137.508) % 360
  const saturation = 0.68
  const lightness = 0.48
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const section = hue / 60
  const secondary = chroma * (1 - Math.abs((section % 2) - 1))
  const [red, green, blue] = section < 1
    ? [chroma, secondary, 0]
    : section < 2
      ? [secondary, chroma, 0]
      : section < 3
        ? [0, chroma, secondary]
        : section < 4
          ? [0, secondary, chroma]
          : section < 5
            ? [secondary, 0, chroma]
            : [chroma, 0, secondary]
  const offset = lightness - chroma / 2
  return `#${[red, green, blue]
    .map(channel => Math.round((channel + offset) * 255).toString(16).padStart(2, '0'))
    .join('')}`
}

function colorsByCategory(
  definitions: readonly CategoryRegistryDefinition[]
): Map<string, string> {
  const colors = new Map<string, string>()
  for (const [index, definition] of definitions.entries()) {
    colors.set(
      definition.registryKey,
      CATEGORY_COLORS[index] || hueColor(index)
    )
  }
  return colors
}

export function buildMigratedCategoryState(
  tags: readonly Tag[],
  relations: readonly RepoTag[],
  preview: CategoryMigrationPreview,
  sourceVersion: string
): { tags: StoredTag[]; repoTags: RepoTag[] } {
  if (preview.hasConflicts) {
    throw new Error('分类迁移预览包含冲突，必须先解决冲突')
  }
  const now = Date.now()
  const tagsById = new Map(tags.map(tag => [tag.id, toStoredTag(tag)]))
  const remappedTagIds = new Map<string, string>()
  const categoryColors = colorsByCategory(
    preview.operations.map(operation => operation.definition)
  )

  for (const operation of preview.operations) {
    const definition = operation.definition
    if (operation.status === 'unchanged') continue
    if (operation.status === 'create') {
      const id = createStableCategoryId(definition.registryKey)
      if (tagsById.has(id)) throw new Error(`分类 ID 冲突: ${id}`)
      tagsById.set(id, {
        id,
        name: definition.nameZh,
        color: definition.color || categoryColors.get(definition.registryKey) || CATEGORY_COLORS[0],
        emoji: definition.emoji,
        registry: registryMetadata(definition, sourceVersion),
        createdAt: now,
        updatedAt: now
      })
      continue
    }

    if (!operation.targetTagId) {
      throw new Error(`迁移操作缺少目标分类: ${definition.nameZh}`)
    }
    const current = tagsById.get(operation.targetTagId)
    if (!current) throw new Error(`目标分类不存在: ${operation.targetTagId}`)
    tagsById.set(operation.targetTagId, {
      ...current,
      name: definition.nameZh,
      color: definition.color || current.color,
      emoji: definition.emoji || current.emoji,
      registry: registryMetadata(definition, sourceVersion),
      updatedAt: now
    })
    for (const sourceTagId of operation.sourceTagIds) {
      if (sourceTagId === operation.targetTagId) continue
      remappedTagIds.set(sourceTagId, operation.targetTagId)
      tagsById.delete(sourceTagId)
    }
  }

  return {
    tags: [...tagsById.values()],
    repoTags: deduplicateRepoTags(
      relations.map(relation => ({
        repoId: relation.repoId,
        tagId: remappedTagIds.get(relation.tagId) || relation.tagId
      }))
    ).filter(relation => tagsById.has(relation.tagId))
  }
}

async function assertNoOpenClassificationTask() {
  const tasks = await db.classificationTasks.toArray()
  const openTask = tasks.find(
    task => !task.committedAt && task.status !== 'cancelled'
  )
  if (openTask) {
    throw new Error('请先完成或取消当前 AI 分类任务，再修改正式分类注册表。')
  }
}

function snapshot(
  reason: string,
  tags: readonly StoredTag[],
  repoTags: readonly RepoTag[],
  sourceVersion?: string
): CategoryMigrationSnapshot {
  const createdAt = Date.now()
  return {
    id: `category_migration_${createdAt}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt,
    reason,
    sourceVersion,
    tags: tags.map(tag => toStoredTag(tag)),
    repoTags: repoTags.map(relation => ({ ...relation }))
  }
}

async function persistStateWithSnapshot(
  migrationSnapshot: CategoryMigrationSnapshot,
  tags: readonly StoredTag[],
  repoTags: readonly RepoTag[]
) {
  await db.transaction(
    'rw',
    db.tags,
    db.repoTags,
    db.categoryMigrationSnapshots,
    async () => {
      await db.categoryMigrationSnapshots.add(migrationSnapshot)
      await db.tags.clear()
      await db.repoTags.clear()
      if (tags.length > 0) await db.tags.bulkAdd(tags)
      if (repoTags.length > 0) await db.repoTags.bulkAdd(repoTags)
    }
  )

  const snapshots = await db.categoryMigrationSnapshots
    .orderBy('createdAt')
    .reverse()
    .toArray()
  if (snapshots.length > 10) {
    await db.categoryMigrationSnapshots.bulkDelete(
      snapshots.slice(10).map(item => item.id)
    )
  }
}

export async function applyCategoryRegistryMigration(
  definitions: readonly CategoryRegistryDefinition[],
  sourceVersion: string
): Promise<CategoryMigrationResult> {
  return runDataMutation(async () => {
    await ensureDatabaseOpen()
    await assertNoOpenClassificationTask()
    const [storedTags, relations] = await Promise.all([
      db.tags.toArray(),
      db.repoTags.toArray()
    ])
    const relationIdsByTag = new Map<string, number[]>()
    for (const relation of relations) {
      const repositoryIds = relationIdsByTag.get(relation.tagId) || []
      repositoryIds.push(relation.repoId)
      relationIdsByTag.set(relation.tagId, repositoryIds)
    }
    const tags: Tag[] = storedTags.map(tag => ({
      ...tag,
      repos: relationIdsByTag.get(tag.id) || []
    }))
    const preview = buildCategoryMigrationPreview(
      tags,
      definitions,
      sourceVersion
    )
    const nextState = buildMigratedCategoryState(
      tags,
      relations,
      preview,
      sourceVersion
    )
    const migrationSnapshot = snapshot(
      `导入正式分类注册表 ${sourceVersion}`,
      storedTags,
      relations,
      sourceVersion
    )
    await persistStateWithSnapshot(
      migrationSnapshot,
      nextState.tags,
      nextState.repoTags
    )

    return {
      snapshotId: migrationSnapshot.id,
      created: preview.counts.create,
      renamed: preview.counts.rename,
      merged: preview.counts.merge,
      updated: preview.counts.update,
      unchanged: preview.counts.unchanged,
      relationCountBefore: relations.length,
      relationCountAfter: nextState.repoTags.length
    }
  })
}

export async function updateCategorySafely(
  tagId: string,
  definition: CategoryRegistryDefinition
): Promise<void> {
  return runDataMutation(async () => {
    await ensureDatabaseOpen()
    await assertNoOpenClassificationTask()
    const [storedTags, relations] = await Promise.all([
      db.tags.toArray(),
      db.repoTags.toArray()
    ])
    const current = storedTags.find(tag => tag.id === tagId)
    if (!current) throw new Error('分类不存在')
    const duplicateName = storedTags.find(
      tag => tag.id !== tagId &&
        normalizeCategoryName(tag.name) === normalizeCategoryName(definition.nameZh)
    )
    if (duplicateName) throw new Error('已有同名分类，请使用“合并分类”')

    const migrationSnapshot = snapshot(
      `编辑分类 ${current.name}`,
      storedTags,
      relations,
      definition.registryKey
    )
    const nextTags = storedTags.map(tag => {
      if (tag.id !== tagId) return tag
      const updatedTag: StoredTag = {
        ...tag,
        name: definition.nameZh,
        color: definition.color || tag.color,
        emoji: definition.emoji || tag.emoji,
        updatedAt: Date.now()
      }
      if (tag.registry) {
        updatedTag.registry = registryMetadata(
          definition,
          tag.registry.sourceVersion
        )
      }
      return updatedTag
    })
    await persistStateWithSnapshot(migrationSnapshot, nextTags, relations)
  })
}

export async function mergeCategoriesSafely(
  targetTagId: string,
  sourceTagIds: readonly string[]
): Promise<number> {
  return runDataMutation(async () => {
    await ensureDatabaseOpen()
    await assertNoOpenClassificationTask()
    const uniqueSourceIds = [...new Set(sourceTagIds)].filter(
      tagId => tagId && tagId !== targetTagId
    )
    if (uniqueSourceIds.length === 0) return 0
    const [storedTags, relations] = await Promise.all([
      db.tags.toArray(),
      db.repoTags.toArray()
    ])
    const target = storedTags.find(tag => tag.id === targetTagId)
    if (!target) throw new Error('目标分类不存在')
    const validSourceIds = uniqueSourceIds.filter(tagId =>
      storedTags.some(tag => tag.id === tagId)
    )
    if (validSourceIds.length === 0) return 0
    const sourceIdSet = new Set(validSourceIds)
    const nextTags = storedTags
      .filter(tag => !sourceIdSet.has(tag.id))
      .map(tag => tag.id === targetTagId
        ? { ...tag, updatedAt: Date.now() }
        : tag)
    const nextRelations = deduplicateRepoTags(
      relations.map(relation => ({
        repoId: relation.repoId,
        tagId: sourceIdSet.has(relation.tagId)
          ? targetTagId
          : relation.tagId
      }))
    )
    const migrationSnapshot = snapshot(
      `合并 ${validSourceIds.length} 个分类到 ${target.name}`,
      storedTags,
      relations,
      target.registry?.sourceVersion
    )
    await persistStateWithSnapshot(
      migrationSnapshot,
      nextTags,
      nextRelations
    )
    return validSourceIds.length
  })
}

export async function latestCategoryMigrationSnapshot(): Promise<
  CategoryMigrationSnapshot | undefined
> {
  await ensureDatabaseOpen()
  return db.categoryMigrationSnapshots.orderBy('createdAt').last()
}

export async function undoLatestCategoryMigration(): Promise<string | null> {
  return runDataMutation(async () => {
    await ensureDatabaseOpen()
    await assertNoOpenClassificationTask()
    const latest = await latestCategoryMigrationSnapshot()
    if (!latest) return null
    await db.transaction(
      'rw',
      db.tags,
      db.repoTags,
      db.categoryMigrationSnapshots,
      async () => {
        await db.tags.clear()
        await db.repoTags.clear()
        if (latest.tags.length > 0) await db.tags.bulkAdd(latest.tags)
        if (latest.repoTags.length > 0) {
          await db.repoTags.bulkAdd(latest.repoTags)
        }
        await db.categoryMigrationSnapshots.delete(latest.id)
      }
    )
    return latest.reason
  })
}
