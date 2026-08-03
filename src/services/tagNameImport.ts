export interface TagNameImportResult {
  names: string[]
  duplicates: number
  invalid: number
}

const MAX_TAG_NAME_LENGTH = 80

function normalizeTagName(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const normalized = value
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+/g, ' ')

  if (!normalized || normalized.length > MAX_TAG_NAME_LENGTH) {
    return null
  }

  return normalized
}

function extractJsonNames(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'name' in item) {
        return (item as { name?: unknown }).name
      }
      return null
    })
  }

  if (!value || typeof value !== 'object') return []

  const record = value as Record<string, unknown>
  if (Array.isArray(record.tags)) {
    return extractJsonNames(record.tags)
  }

  if (record.data && typeof record.data === 'object') {
    const data = record.data as Record<string, unknown>
    if (Array.isArray(data.tags)) {
      return extractJsonNames(data.tags)
    }
  }

  return []
}

function extractTextNames(text: string): string[] {
  const normalized = text.replace(/^\uFEFF/, '').trim()
  if (!normalized) return []

  const lines = normalized.split(/\r?\n/)
  const values = lines.length > 1
    ? lines.flatMap(line => line.split(/[，,;；\t]+/))
    : normalized.split(/[，,;；\t]+/)

  return values
}

export function parseTagNameImport(text: string): TagNameImportResult {
  const trimmed = text.replace(/^\uFEFF/, '').trim()
  if (!trimmed) {
    return { names: [], duplicates: 0, invalid: 0 }
  }

  let candidates: unknown[]
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      candidates = extractJsonNames(JSON.parse(trimmed))
    } catch {
      candidates = extractTextNames(trimmed)
    }
  } else {
    candidates = extractTextNames(trimmed)
  }

  const names: string[] = []
  const seen = new Set<string>()
  let duplicates = 0
  let invalid = 0

  for (const candidate of candidates) {
    const name = normalizeTagName(candidate)
    if (!name) {
      invalid++
      continue
    }

    const key = name.toLocaleLowerCase()
    if (seen.has(key)) {
      duplicates++
      continue
    }

    seen.add(key)
    names.push(name)
  }

  return { names, duplicates, invalid }
}
