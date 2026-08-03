# 项目结构与代码导航

```text
StarHub/
├── .github/workflows/       # CI 与 GitHub Pages 部署
├── docs/                    # VitePress 文档源文件
│   ├── .vitepress/          # 文档导航、主题和构建配置
│   ├── config/              # AI、数据、主题/语言
│   ├── deploy/              # Cloudflare 与自托管
│   ├── development/         # 审计、状态、路线图和交接
│   ├── guide/               # 用户与安装指南
│   ├── reference/           # 架构、功能、结构、技术栈
│   └── troubleshooting/     # 登录、存储和常见问题
├── functions/api/           # Cloudflare Pages Functions
├── public/                  # 应用静态资源
├── scripts/                 # 构建、安全和配置验证脚本
├── src/
│   ├── api/                 # GitHub、OAuth 与网络请求封装
│   ├── config/              # AI、OAuth 与分类配置
│   ├── db/                  # Dexie schema 与数据库升级
│   ├── i18n/locales/        # 中英文语言包
│   ├── layouts/             # 页面布局
│   ├── pages/               # 登录、首页、设置
│   ├── services/            # 同步、分类、治理、README、重点标记
│   ├── stores/              # Pinia stores
│   ├── styles/              # 全局样式与变量
│   ├── types/               # 领域类型
│   ├── utils/               # 认证、OAuth、endpoint 等工具
│   └── workers/             # README 渲染 worker
└── tests/                   # Node 单元与源代码约束测试
```

## 按任务找代码

| 任务 | 入口 |
|---|---|
| GitHub 登录 | `src/api/auth.ts`、`src/utils/oauth*.ts`、`functions/api/oauth/token.ts` |
| Stars 同步 | `src/services/repoSync.ts`、`src/stores/repo.ts`、`src/api/github.ts` |
| 数据库升级 | `src/db/index.ts`、`src/types/index.ts` |
| 分类关系 | `src/services/tagRelations.ts`、`src/stores/tag.ts` |
| 正式分类治理 | `categoryGovernance.ts`、`categoryRegistryImport.ts`、`classificationRegistry.ts` |
| AI 协议与验证 | `classificationProtocol.ts`、`classificationValidation.ts`、`openAICompatible.ts` |
| AI 持久任务 | `classificationTasks.ts`、`src/stores/classificationTask.ts` |
| README 增强 | `classificationEnhancement*.ts`、`classificationReadme*.ts` |
| 重点标记 | `repositoryHighlights.ts`、`src/stores/highlight.ts` |
| 搜索/排序/分页 | `repositoryView.ts`、首页页面组件 |
| README 详情性能 | `readmeRenderer.ts`、`workers/readmeRenderer.worker.ts` |
| 国际化 | `src/i18n/locales/zh.ts` 与 `en.ts` |
| Pages 构建 | `scripts/build-pages.mjs`、`deploy-pages.yml` |

## 修改时的边界

- 关系写入必须走 `repoTags` 与数据变更队列；
- AI 输出验证和写库分离，不在视图组件中直接写关系；
- 新的持久字段同时更新类型、Dexie 版本、备份、清空路径、测试和文档；
- 新 UI 文案同时加入中英文语言包，不在模板硬编码；
- 新网络请求必须有 timeout、AbortSignal 与用户可理解的状态；
- 新外部主机需要同步检查 CSP 和安全验证脚本；
- 历史开发文档不得被当作当前产品规范，当前规范以代码、测试和主文档为准。
