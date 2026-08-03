import { defineConfig } from 'vitepress'

function normalizeBase(base: string): string {
  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

const docsBase = normalizeBase(process.env.VITEPRESS_BASE_PATH || '/')

export default defineConfig({
  base: docsBase,
  vite: {
    server: {
      port: 5174
    }
  },
  ignoreDeadLinks: [
    /^http:\/\/localhost/,
    /^https:\/\/localhost/,
  ],
  title: 'StarHub',
  description: '专业的 GitHub Stars 管理工具',
  lang: 'zh-CN',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${docsBase}logo.svg` }],
    ['meta', { name: 'theme-color', content: '#1c2333' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/installation' },
      { text: '配置', link: '/config/ai' },
      { text: '部署', link: '/deploy/cloudflare' },
      {
        text: '更多',
        items: [
          { text: '更新日志', link: '/changelog' },
          { text: '贡献指南', link: '/contributing' },
          { text: '开发状态与交接', link: '/development/PROJECT_STATUS' },
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '快速开始',
          items: [
            { text: '快速安装', link: '/guide/installation' },
            { text: 'GitHub OAuth 配置', link: '/guide/oauth' },
          ]
        },
        {
          text: '使用指南',
          items: [
            { text: '基础使用', link: '/guide/basic' },
            { text: '标签管理', link: '/guide/tags' },
            { text: 'AI 智能分类', link: '/guide/ai-classification' },
            { text: '搜索与筛选', link: '/guide/search' },
          ]
        }
      ],
      '/config/': [
        {
          text: '配置',
          items: [
            { text: 'AI 服务配置', link: '/config/ai' },
            { text: '主题与语言', link: '/config/theme' },
            { text: '数据管理', link: '/config/data' },
          ]
        }
      ],
      '/deploy/': [
        {
          text: '部署指南',
          items: [
            { text: 'Cloudflare Pages', link: '/deploy/cloudflare' },
            { text: '自托管', link: '/deploy/self-host' },
          ]
        }
      ],
      '/troubleshooting/': [
        {
          text: '故障排除',
          items: [
            { text: '常见问题', link: '/troubleshooting/faq' },
            { text: '存储问题', link: '/troubleshooting/storage' },
            { text: '登录问题', link: '/troubleshooting/login' },
          ]
        }
      ],
      '/reference/': [
        {
          text: '参考',
          items: [
            { text: '技术栈', link: '/reference/tech-stack' },
            { text: '项目结构', link: '/reference/structure' },
          ]
        }
      ],
      '/development/': [
        {
          text: '开发与交接',
          items: [
            { text: '项目状态', link: '/development/PROJECT_STATUS' },
            { text: '后续路线图与接手', link: '/development/NEXT_PHASE_HANDOFF' },
            { text: 'AI 分类审计', link: '/development/AI_CLASSIFICATION_AUDIT' },
            { text: '本地 OAuth', link: '/development/local-oauth' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hujinghaoabcd/StarHub' }
    ],

    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © 2024 StarHub'
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换'
            }
          }
        }
      }
    },

    outline: {
      label: '页面导航',
      level: [2, 3]
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    lastUpdated: {
      text: '最后更新于',
    },

    editLink: {
      pattern: 'https://github.com/hujinghaoabcd/StarHub/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页面'
    }
  }
})
