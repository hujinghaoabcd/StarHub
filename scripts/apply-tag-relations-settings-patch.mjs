import { readFile, writeFile } from 'node:fs/promises'

const path = 'src/pages/Settings/index.vue'
let source = await readFile(path, 'utf8')

if (source.includes("from '@/services/tagRelations'")) {
  console.log('Settings tag relation patch is already applied.')
  process.exit(0)
}

function replaceExact(before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Could not locate ${label}`)
  }
  source = source.replace(before, after)
}

replaceExact(
  "import { db } from '@/db'\nimport Dexie from 'dexie'",
  "import { db } from '@/db'\nimport type { Repository, Tag } from '@/types'\nimport {\n  buildRepoTagsFromTags,\n  toStoredTag\n} from '@/services/tagRelations'\nimport Dexie from 'dexie'",
  'Settings imports'
)

replaceExact(
  `    const repos = await db.repos.toArray()
    const tags = await db.tags.toArray()
    
    const taggedRepoIds = new Set<number>()
    tags.forEach(tag => {
      if (tag.repos && Array.isArray(tag.repos)) {
        tag.repos.forEach(id => taggedRepoIds.add(id))
      }
    })`,
  `    const [repos, tags, relations] = await Promise.all([
      db.repos.toArray(),
      db.tags.toArray(),
      db.repoTags.toArray()
    ])
    const taggedRepoIds = new Set(relations.map(relation => relation.repoId))`,
  'data statistics relation query'
)

replaceExact(
  `    // 收集所有数据
    const repos = await db.repos.toArray()
    const tags = await db.tags.toArray()
    
    const exportData = {
      version: '1.0',`,
  `    // Collect a portable snapshot. Tag membership is hydrated from repoTags.
    await tagStore.loadTags()
    const repos = await db.repos.toArray()
    const tags = tagStore.tags.map(tag => ({
      ...tag,
      repos: [...tag.repos]
    }))
    
    const exportData = {
      version: '2.0',`,
  'backup export snapshot'
)

replaceExact(
  `      // 清空现有数据
      await db.repos.clear()
      await db.tags.clear()
      
      // 导入新数据
      if (importData.data.repos && importData.data.repos.length > 0) {
        await db.repos.bulkAdd(importData.data.repos)
      }
      
      if (importData.data.tags && importData.data.tags.length > 0) {
        await db.tags.bulkAdd(importData.data.tags)
      }`,
  `      const now = Date.now()
      const importedRepos: Repository[] = Array.isArray(importData.data.repos)
        ? importData.data.repos
        : []
      const importedTags: Tag[] = Array.isArray(importData.data.tags)
        ? importData.data.tags.map((tag: Partial<Tag>) => ({
            id: String(tag.id || ''),
            name: String(tag.name || ''),
            color: String(tag.color || '#409EFF'),
            emoji: tag.emoji,
            repos: Array.isArray(tag.repos)
              ? Array.from(new Set(tag.repos.filter(Number.isFinite)))
              : [],
            createdAt: Number(tag.createdAt) || now,
            updatedAt: Number(tag.updatedAt) || now
          })).filter((tag: Tag) => tag.id && tag.name)
        : []
      const storedTags = importedTags.map(toStoredTag)
      const relations = buildRepoTagsFromTags(importedTags)

      await db.transaction(
        'rw',
        db.repos,
        db.tags,
        db.repoTags,
        async () => {
          await db.repos.clear()
          await db.tags.clear()
          await db.repoTags.clear()

          if (importedRepos.length > 0) {
            await db.repos.bulkAdd(importedRepos)
          }
          if (storedTags.length > 0) {
            await db.tags.bulkAdd(storedTags)
          }
          if (relations.length > 0) {
            await db.repoTags.bulkAdd(relations)
          }
        }
      )`,
  'backup import transaction'
)

replaceExact(
  `          // Clear all tables
          await db.repos.clear()
          await db.tags.clear()
          
          // Clear repoTags table if exists
          if (db.repoTags) {
            await db.repoTags.clear()
          }`,
  `          // Clear all canonical tables in one transaction.
          await db.transaction(
            'rw',
            db.repos,
            db.tags,
            db.repoTags,
            async () => {
              await db.repos.clear()
              await db.tags.clear()
              await db.repoTags.clear()
            }
          )`,
  'clear-all database transaction'
)

await writeFile(path, source)
console.log('Applied Settings tag relation patch.')
