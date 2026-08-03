import type { CategoryPreset } from '@/config/categories'
import type { ClassificationCategory, Tag } from '@/types'

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase()
}

/**
 * Build the model-facing registry exclusively from tags that already exist.
 * The persisted tag ID is the stable category ID; presets only enrich the
 * description and examples and can never create a category implicitly.
 */
export function buildClassificationRegistry(
  tags: readonly Tag[],
  presets: readonly CategoryPreset[],
  language = 'zh'
): ClassificationCategory[] {
  const presetsByName = new Map<string, CategoryPreset>()
  for (const preset of presets) {
    presetsByName.set(normalizeName(preset.name), preset)
    if (preset.nameEn) {
      presetsByName.set(normalizeName(preset.nameEn), preset)
    }
  }

  const seenIds = new Set<string>()
  const isChinese = language === 'zh' || language === 'zh-CN'

  return tags.flatMap(tag => {
    const categoryId = tag.id.trim()
    const name = tag.name.trim()
    if (!categoryId || !name || seenIds.has(categoryId)) return []
    seenIds.add(categoryId)

    const preset = presetsByName.get(normalizeName(name))
    const description = preset
      ? (isChinese
          ? preset.description
          : preset.descriptionEn || preset.description)
      : isChinese
        ? `用户创建的分类：${name}`
        : `User-created category: ${name}`

    return [{
      categoryId,
      name,
      description: description.trim(),
      examples: preset?.keywords.slice(0, 12) || [],
      exclusions: []
    }]
  })
}

export function buildClassificationRegistryVersion(
  categories: readonly ClassificationCategory[]
): string {
  const stableRegistry = [...categories]
    .sort((a, b) => a.categoryId.localeCompare(b.categoryId))
    .map(category => ({
      categoryId: category.categoryId,
      name: category.name,
      description: category.description,
      examples: [...category.examples],
      exclusions: [...category.exclusions]
    }))
  const input = JSON.stringify(stableRegistry)
  let hash = 0x811c9dc5

  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return `registry-v1-${(hash >>> 0).toString(16).padStart(8, '0')}`
}
