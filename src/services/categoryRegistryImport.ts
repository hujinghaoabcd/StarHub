export interface CategoryRegistryDefinition {
  registryKey: string
  nameZh: string
  nameEn: string
  aliases: string[]
  descriptionZh: string
  descriptionEn: string
  examples: string[]
  exclusions: string[]
  level1?: string
  level2?: string
  color?: string
  emoji?: string
}

export interface CategoryRegistryImportResult {
  sourceVersion: string
  definitions: CategoryRegistryDefinition[]
  duplicates: number
  invalid: number
}

const MAX_NAME_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 1_000
const MAX_LIST_ITEMS = 30

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

function normalizeList(value: unknown): string[] {
  const candidates = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[，,;；\n]+/)
      : []
  const seen = new Set<string>()
  const result: string[] = []

  for (const candidate of candidates) {
    const text = normalizeText(candidate, MAX_NAME_LENGTH)
    const key = text.toLocaleLowerCase()
    if (!text || seen.has(key)) continue
    seen.add(key)
    result.push(text)
    if (result.length >= MAX_LIST_ITEMS) break
  }
  return result
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36).padStart(7, '0')
}

export function normalizeCategoryName(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s·•—–_-]+/g, '')
    .replace(/[，,；;：:、｜|/\\()[\]{}（）【】]/g, '')
}

export function createStableCategoryId(registryKey: string): string {
  const safeKey = registryKey
    .normalize('NFKC')
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return `category_${safeKey || stableHash(registryKey)}`
}

/** Keep formal registry metadata portable across StarHub backup versions. */
export function normalizeCategoryRegistryMetadata(
  value: unknown
): CategoryRegistryMetadata | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (record.managed !== true || Number(record.schemaVersion) !== 2) {
    return undefined
  }
  const registryKey = normalizeText(record.registryKey, MAX_NAME_LENGTH)
  const sourceVersion = normalizeText(record.sourceVersion, MAX_NAME_LENGTH)
  const nameZh = normalizeText(record.nameZh, MAX_NAME_LENGTH)
  if (!registryKey || !sourceVersion || !nameZh) return undefined

  return {
    schemaVersion: 2,
    managed: true,
    registryKey,
    sourceVersion,
    nameZh,
    nameEn: normalizeText(record.nameEn, MAX_NAME_LENGTH) || nameZh,
    aliases: normalizeList(record.aliases),
    descriptionZh: normalizeText(record.descriptionZh, MAX_DESCRIPTION_LENGTH),
    descriptionEn: normalizeText(record.descriptionEn, MAX_DESCRIPTION_LENGTH),
    examples: normalizeList(record.examples),
    exclusions: normalizeList(record.exclusions),
    level1: normalizeText(record.level1, MAX_NAME_LENGTH) || undefined,
    level2: normalizeText(record.level2, MAX_NAME_LENGTH) || undefined
  }
}

function derivedAliases(level2: string): string[] {
  const aliases: string[] = []
  for (const match of level2.matchAll(/[（(]([^()（）]{2,40})[）)]/g)) {
    aliases.push(match[1])
  }
  const leadingTechnology = level2.match(
    /^([A-Za-z][A-Za-z0-9.+#-]{3,})\s+[\u3400-\u9fff]/
  )
  if (leadingTechnology) aliases.push(leadingTechnology[1])
  return aliases
}

function candidateRecords(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  if (Array.isArray(record.tags)) return record.tags
  if (record.data && typeof record.data === 'object') {
    const data = record.data as Record<string, unknown>
    if (Array.isArray(data.tags)) return data.tags
  }
  return []
}

function textCandidates(text: string): string[] {
  const normalized = text.replace(/^\uFEFF/, '').trim()
  if (!normalized) return []
  return normalized
    .split(/\r?\n/)
    .flatMap(line => line.split(/[，,;；\t]+/))
    .map(value => value.trim())
}

function definitionFromCandidate(
  candidate: unknown
): CategoryRegistryDefinition | null {
  const record = candidate && typeof candidate === 'object'
    ? candidate as Record<string, unknown>
    : null
  const rawName = typeof candidate === 'string'
    ? candidate
    : record?.nameZh ?? record?.name
  const nameZh = normalizeText(rawName, MAX_NAME_LENGTH)
  if (!nameZh) return null

  const level1 = normalizeText(record?.level1, MAX_NAME_LENGTH) || undefined
  const level2 = normalizeText(record?.level2, MAX_NAME_LENGTH) || undefined
  const nameEn = normalizeText(
    record?.nameEn ?? record?.level2En,
    MAX_NAME_LENGTH
  ) || (level2 && !/[\u3400-\u9fff]/.test(level2) ? level2 : nameZh)
  const explicitKey = normalizeText(
    record?.categoryId ?? record?.registryKey ?? record?.sourceId,
    MAX_NAME_LENGTH
  )
  const registryKey = explicitKey || `custom-${stableHash(normalizeCategoryName(nameZh))}`
  const aliases = normalizeList([
    ...normalizeList(record?.aliases),
    ...(level2 ? [level2, ...derivedAliases(level2)] : [])
  ]).filter(alias => normalizeCategoryName(alias) !== normalizeCategoryName(nameZh))
  const descriptionZh = normalizeText(
    record?.descriptionZh ?? record?.description,
    MAX_DESCRIPTION_LENGTH
  ) || `收录与“${level2 || nameZh}”直接相关的 GitHub 仓库。`
  const descriptionEn = normalizeText(
    record?.descriptionEn,
    MAX_DESCRIPTION_LENGTH
  ) || descriptionZh

  return {
    registryKey,
    nameZh,
    nameEn,
    aliases,
    descriptionZh,
    descriptionEn,
    examples: normalizeList(record?.examples ?? record?.keywords),
    exclusions: normalizeList(record?.exclusions),
    level1,
    level2,
    color: normalizeText(record?.color, 20) || undefined,
    emoji: normalizeText(record?.emoji, 8) || undefined
  }
}

export function parseCategoryRegistryImport(
  text: string
): CategoryRegistryImportResult {
  const trimmed = text.replace(/^\uFEFF/, '').trim()
  if (!trimmed) {
    return {
      sourceVersion: 'custom-empty',
      definitions: [],
      duplicates: 0,
      invalid: 0
    }
  }

  let parsed: unknown = null
  let candidates: unknown[]
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      parsed = JSON.parse(trimmed) as unknown
      candidates = candidateRecords(parsed)
    } catch {
      candidates = textCandidates(trimmed)
    }
  } else {
    candidates = textCandidates(trimmed)
  }

  const sourceVersion = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? normalizeText(
        (parsed as Record<string, unknown>).version,
        MAX_NAME_LENGTH
      ) || 'custom-v1'
    : 'custom-v1'
  const definitions: CategoryRegistryDefinition[] = []
  const seenRegistryKeys = new Set<string>()
  const seenNames = new Set<string>()
  let duplicates = 0
  let invalid = 0

  for (const candidate of candidates) {
    const definition = definitionFromCandidate(candidate)
    if (!definition) {
      invalid++
      continue
    }
    const registryKey = definition.registryKey.toLocaleLowerCase()
    const nameKey = normalizeCategoryName(definition.nameZh)
    if (seenRegistryKeys.has(registryKey) || seenNames.has(nameKey)) {
      duplicates++
      continue
    }
    seenRegistryKeys.add(registryKey)
    seenNames.add(nameKey)
    definitions.push(definition)
  }

  return { sourceVersion, definitions, duplicates, invalid }
}
import type { CategoryRegistryMetadata } from '@/types'
