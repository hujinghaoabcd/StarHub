import { db } from '@/db'
import { runDataMutation } from '@/services/dataMutationQueue'
import type { StoredTag } from '@/types'

export interface ImportTagNamesResult {
  created: number
  skipped: number
}

const IMPORT_TAG_COLORS = [
  '#409EFF',
  '#67C23A',
  '#E6A23C',
  '#F56C6C',
  '#909399',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899'
]

function createTagId(index: number): string {
  return `tag_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 11)}`
}

async function ensureDatabaseOpen() {
  if (!db.isOpen()) {
    await db.open()
  }
}

export async function importTagNames(
  names: readonly string[]
): Promise<ImportTagNamesResult> {
  return runDataMutation(async () => {
    await ensureDatabaseOpen()

    const existingTags = await db.tags.toArray()
    const existingNames = new Set(
      existingTags.map(tag => tag.name.trim().toLocaleLowerCase())
    )
    const now = Date.now()
    const storedTags: StoredTag[] = []
    let skipped = 0

    for (const rawName of names) {
      const name = rawName.trim().replace(/\s+/g, ' ')
      const key = name.toLocaleLowerCase()

      if (!name || name.length > 80 || existingNames.has(key)) {
        skipped++
        continue
      }

      existingNames.add(key)
      storedTags.push({
        id: createTagId(storedTags.length),
        name,
        color: IMPORT_TAG_COLORS[storedTags.length % IMPORT_TAG_COLORS.length],
        createdAt: now,
        updatedAt: now
      })
    }

    if (storedTags.length > 0) {
      await db.tags.bulkAdd(storedTags)
    }

    return {
      created: storedTags.length,
      skipped
    }
  })
}
