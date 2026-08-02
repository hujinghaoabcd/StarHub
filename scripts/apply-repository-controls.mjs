import { readFile, writeFile } from 'node:fs/promises'

async function replaceExact(path, search, replacement, label) {
  const source = await readFile(path, 'utf8')
  const occurrences = source.split(search).length - 1

  if (occurrences !== 1) {
    throw new Error(`${label}: expected exactly one match in ${path}, found ${occurrences}`)
  }

  await writeFile(path, source.replace(search, replacement))
}

const repoListPath = 'src/pages/Home/components/RepoList.vue'

await replaceExact(
  repoListPath,
  `      <div class="header-actions" v-if="!selectMode">
        <el-dropdown @command="handleSortChange" trigger="click">
          <el-button size="small" text>
            <el-icon><Sort /></el-icon>
            <span style="margin-left: 4px;">{{ sortLabel }}</span>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="updated" :class="{ 'is-active': sortBy === 'updated' }">
                <el-icon><Clock /></el-icon>
                <span>按更新时间</span>
                <el-icon v-if="sortBy === 'updated'" class="check-icon"><Check /></el-icon>
              </el-dropdown-item>
              <el-dropdown-item command="stars" :class="{ 'is-active': sortBy === 'stars' }">
                <el-icon><Star /></el-icon>
                <span>按星标数</span>
                <el-icon v-if="sortBy === 'stars'" class="check-icon"><Check /></el-icon>
              </el-dropdown-item>
              <el-dropdown-item command="created" :class="{ 'is-active': sortBy === 'created' }">
                <el-icon><Calendar /></el-icon>
                <span>按创建时间</span>
                <el-icon v-if="sortBy === 'created'" class="check-icon"><Check /></el-icon>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>`,
  `      <div class="header-actions" v-if="!selectMode">
        <el-dropdown @command="handleSortChange" trigger="click">
          <el-button size="small" text>
            <el-icon><Sort /></el-icon>
            <span style="margin-left: 4px;">{{ sortLabel }}</span>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="updated" :class="{ 'is-active': sortBy === 'updated' }">
                <el-icon><Clock /></el-icon>
                <span>按更新时间</span>
                <el-icon v-if="sortBy === 'updated'" class="check-icon"><Check /></el-icon>
              </el-dropdown-item>
              <el-dropdown-item command="stars" :class="{ 'is-active': sortBy === 'stars' }">
                <el-icon><Star /></el-icon>
                <span>按星标数</span>
                <el-icon v-if="sortBy === 'stars'" class="check-icon"><Check /></el-icon>
              </el-dropdown-item>
              <el-dropdown-item command="created" :class="{ 'is-active': sortBy === 'created' }">
                <el-icon><Calendar /></el-icon>
                <span>按创建时间</span>
                <el-icon v-if="sortBy === 'created'" class="check-icon"><Check /></el-icon>
              </el-dropdown-item>
              <el-dropdown-item command="name" :class="{ 'is-active': sortBy === 'name' }">
                <span class="sort-name-icon">A–Z</span>
                <span>按项目名称</span>
                <el-icon v-if="sortBy === 'name'" class="check-icon"><Check /></el-icon>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button
          size="small"
          text
          :title="sortOrder === 'asc' ? '当前升序，点击切换为降序' : '当前降序，点击切换为升序'"
          @click="toggleSortOrder"
        >
          <span class="sort-direction">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
          {{ sortOrder === 'asc' ? '升序' : '降序' }}
        </el-button>
      </div>`,
  'replace sort controls'
)

await replaceExact(
  repoListPath,
  '          v-for="repo in sortedRepos"',
  '          v-for="repo in repos"',
  'render globally sorted page'
)

await replaceExact(
  repoListPath,
  '        :page-sizes="[50, 100, 200, 500]"',
  '        :page-sizes="repositoryPageSizes"',
  'add 1000 page size'
)

await replaceExact(
  repoListPath,
  `import type { Repository } from '@/types'
import { Box, Collection, Close, Check, Sort, Clock, Star, Calendar } from '@element-plus/icons-vue'`,
  `import type { Repository } from '@/types'
import {
  REPOSITORY_PAGE_SIZES,
  type RepositorySortField
} from '@/services/repositoryView'
import { Box, Collection, Close, Check, Sort, Clock, Star, Calendar } from '@element-plus/icons-vue'`,
  'import repository view controls'
)

await replaceExact(
  repoListPath,
  `// 排序相关
const sortBy = ref<'updated' | 'stars' | 'created'>('updated')

const sortLabel = computed(() => {
  switch (sortBy.value) {
    case 'updated':
      return '按更新时间'
    case 'stars':
      return '按星标数'
    case 'created':
      return '按创建时间'
    default:
      return '排序'
  }
})

const handleSortChange = (command: 'updated' | 'stars' | 'created') => {
  sortBy.value = command
}

const sortedRepos = computed(() => {
  const reposCopy = [...props.repos]
  
  switch (sortBy.value) {
    case 'stars':
      return reposCopy.sort((a, b) => b.stargazers_count - a.stargazers_count)
    case 'created':
      return reposCopy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    case 'updated':
    default:
      return reposCopy.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }
})`,
  `// 排序应用于全部筛选结果，然后再由 store 分页
const sortBy = computed(() => repoStore.sortBy)
const sortOrder = computed(() => repoStore.sortOrder)
const repositoryPageSizes = [...REPOSITORY_PAGE_SIZES]

const sortLabel = computed(() => {
  switch (sortBy.value) {
    case 'updated':
      return '按更新时间'
    case 'stars':
      return '按星标数'
    case 'created':
      return '按创建时间'
    case 'name':
      return '按项目名称'
    default:
      return '排序'
  }
})

const handleSortChange = (command: RepositorySortField) => {
  repoStore.setSortBy(command)
}

const toggleSortOrder = () => {
  repoStore.toggleSortOrder()
}`,
  'replace page-only sorting'
)

await replaceExact(
  repoListPath,
  `const totalCount = computed(() => {
  // Calculate total count from allFilteredRepos
  const allRepos = (repoStore as any).allFilteredRepos || []
  console.log('Total filtered repos:', allRepos.length)
  return allRepos.length
})

const totalPages = computed(() => {
  const pages = Math.ceil(totalCount.value / pageSize.value)
  console.log('Total pages:', pages, 'pageSize:', pageSize.value)
  return pages
})`,
  `const totalCount = computed(() => repoStore.totalFilteredCount)
const totalPages = computed(() => repoStore.totalPages)`,
  'use typed store pagination totals'
)

await replaceExact(
  'src/pages/Login.vue',
  "      scope: 'read:user'",
  "      scope: 'read:user public_repo'",
  'request public repository starring permission'
)

console.log('Repository controls migration applied successfully.')
