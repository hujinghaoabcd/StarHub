// 预设分类配置
export interface CategoryPreset {
  name: string // 中文名称（用于显示和匹配）
  nameEn: string // 英文名称
  emoji: string // Emoji 图标
  description: string
  descriptionEn: string // 英文描述
  color: string
  keywords: string[]
}

// 默认预设分类
export const DEFAULT_CATEGORIES: CategoryPreset[] = [
  {
    name: 'Web 开发',
    nameEn: 'Web Development',
    emoji: '🌐',
    description: '前端、后端、全栈 Web 应用和框架',
    descriptionEn: 'Frontend, backend, full-stack web applications and frameworks',
    color: '#42b883',
    keywords: ['web', 'frontend', 'backend', 'react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'express', 'koa', 'fastify', 'nestjs']
  },
  {
    name: '移动开发',
    nameEn: 'Mobile Development',
    emoji: '📱',
    description: 'iOS、Android、跨平台移动应用',
    descriptionEn: 'iOS, Android, cross-platform mobile applications',
    color: '#34a853',
    keywords: ['mobile', 'android', 'ios', 'react-native', 'flutter', 'swift', 'kotlin', 'xamarin']
  },
  {
    name: '数据科学',
    nameEn: 'Data Science',
    emoji: '🤖',
    description: '机器学习、深度学习、数据分析',
    descriptionEn: 'Machine learning, deep learning, data analytics',
    color: '#ff9800',
    keywords: ['machine-learning', 'ml', 'ai', 'deep-learning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'data', 'analytics']
  },
  {
    name: '工具库',
    nameEn: 'Tools & Libraries',
    emoji: '🛠️',
    description: '通用工具、库、框架',
    descriptionEn: 'General tools, libraries, frameworks',
    color: '#9c27b0',
    keywords: ['library', 'framework', 'util', 'helper', 'tool', 'sdk', 'api']
  },
  {
    name: 'DevOps',
    nameEn: 'DevOps',
    emoji: '⚙️',
    description: 'CI/CD、容器化、基础设施',
    descriptionEn: 'CI/CD, containerization, infrastructure',
    color: '#00bcd4',
    keywords: ['devops', 'docker', 'kubernetes', 'k8s', 'ci', 'cd', 'deploy', 'infrastructure', 'terraform', 'ansible']
  },
  {
    name: '游戏开发',
    nameEn: 'Game Development',
    emoji: '🎮',
    description: '游戏引擎、游戏相关工具',
    descriptionEn: 'Game engines, game-related tools',
    color: '#f44336',
    keywords: ['game', 'gaming', 'unity', 'unreal', 'godot', 'phaser', 'cocos']
  },
  {
    name: '数据库',
    nameEn: 'Database',
    emoji: '💾',
    description: '数据库系统、ORM、数据存储',
    descriptionEn: 'Database systems, ORM, data storage',
    color: '#ff5722',
    keywords: ['database', 'sql', 'nosql', 'mongodb', 'postgres', 'mysql', 'redis', 'orm', 'prisma']
  },
  {
    name: '安全',
    nameEn: 'Security',
    emoji: '🔒',
    description: '网络安全、加密、认证',
    descriptionEn: 'Network security, encryption, authentication',
    color: '#e91e63',
    keywords: ['security', 'crypto', 'encryption', 'auth', 'oauth', 'jwt', 'vulnerability']
  },
  {
    name: '区块链',
    nameEn: 'Blockchain',
    emoji: '⛓️',
    description: '加密货币、智能合约、Web3',
    descriptionEn: 'Cryptocurrency, smart contracts, Web3',
    color: '#ffc107',
    keywords: ['blockchain', 'crypto', 'bitcoin', 'ethereum', 'web3', 'smart-contract', 'defi', 'nft']
  },
  {
    name: '编程语言',
    nameEn: 'Programming Language',
    emoji: '💻',
    description: '编译器、解释器、语言工具',
    descriptionEn: 'Compilers, interpreters, language tools',
    color: '#3f51b5',
    keywords: ['compiler', 'interpreter', 'language', 'parser', 'transpiler', 'babel']
  },
  {
    name: '系统编程',
    nameEn: 'Systems Programming',
    emoji: '⚡',
    description: '操作系统、底层开发',
    descriptionEn: 'Operating systems, low-level development',
    color: '#607d8b',
    keywords: ['system', 'os', 'kernel', 'driver', 'embedded', 'low-level', 'c', 'rust', 'assembly']
  },
  {
    name: '设计',
    nameEn: 'Design',
    emoji: '🎨',
    description: 'UI/UX、设计工具、图形处理',
    descriptionEn: 'UI/UX, design tools, graphics processing',
    color: '#e91e63',
    keywords: ['design', 'ui', 'ux', 'figma', 'sketch', 'graphics', 'animation', 'svg']
  },
  {
    name: '文档',
    nameEn: 'Documentation',
    emoji: '📚',
    description: '文档生成、知识管理',
    descriptionEn: 'Documentation generation, knowledge management',
    color: '#795548',
    keywords: ['documentation', 'docs', 'markdown', 'wiki', 'knowledge', 'readme']
  },
  {
    name: '测试',
    nameEn: 'Testing',
    emoji: '🧪',
    description: '测试框架、自动化测试',
    descriptionEn: 'Testing frameworks, automated testing',
    color: '#4caf50',
    keywords: ['test', 'testing', 'jest', 'mocha', 'cypress', 'selenium', 'automation', 'e2e']
  },
  {
    name: 'Awesome',
    nameEn: 'Awesome',
    emoji: '😎',
    description: '精选资源列表',
    descriptionEn: 'Curated resource lists',
    color: '#ff6b6b',
    keywords: ['awesome', 'curated', 'list', 'resources', 'collection']
  },
  {
    name: 'Node.js',
    nameEn: 'Node.js',
    emoji: '🟢',
    description: 'Node.js 生态系统',
    descriptionEn: 'Node.js ecosystem',
    color: '#339933',
    keywords: ['nodejs', 'node', 'npm', 'javascript', 'server']
  },
  {
    name: 'Vue',
    nameEn: 'Vue',
    emoji: '🟩',
    description: 'Vue 生态系统',
    descriptionEn: 'Vue ecosystem',
    color: '#42b883',
    keywords: ['vue', 'vuejs', 'composition-api', 'vuex', 'pinia', 'vite', 'nuxt']
  },
  {
    name: '其他',
    nameEn: 'Others',
    emoji: '📦',
    description: '不属于以上任何类别',
    descriptionEn: 'Not belonging to any of the above categories',
    color: '#9e9e9e',
    keywords: []
  }
]

// 从 localStorage 获取用户自定义的预设分类
export function getCategoryPresets(): CategoryPreset[] {
  const stored = localStorage.getItem('category_presets')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('Failed to parse category presets:', e)
    }
  }
  return [...DEFAULT_CATEGORIES]
}

// 保存预设分类到 localStorage
export function saveCategoryPresets(presets: CategoryPreset[]): void {
  localStorage.setItem('category_presets', JSON.stringify(presets))
}

// 重置为默认预设
export function resetCategoryPresets(): void {
  localStorage.removeItem('category_presets')
}

// 添加预设分类
export function addCategoryPreset(preset: CategoryPreset): void {
  const presets = getCategoryPresets()
  presets.push(preset)
  saveCategoryPresets(presets)
}

// 删除预设分类
export function removeCategoryPreset(name: string): void {
  const presets = getCategoryPresets()
  const filtered = presets.filter(p => p.name !== name)
  saveCategoryPresets(filtered)
}

// 更新预设分类
export function updateCategoryPreset(oldName: string, newPreset: CategoryPreset): void {
  const presets = getCategoryPresets()
  const index = presets.findIndex(p => p.name === oldName)
  if (index !== -1) {
    presets[index] = newPreset
    saveCategoryPresets(presets)
  }
}

