# 项目结构

本页详细介绍 StarHub 的项目目录结构。

## 根目录

```
starhub/
├── public/           # 静态资源（不经过构建）
├── src/              # 源代码
├── server/           # 本地开发服务器
├── functions/        # Cloudflare Workers
├── docs/             # 文档
├── package.json      # 项目配置
├── vite.config.ts    # Vite 配置
├── tsconfig.json     # TypeScript 配置
└── README.md         # 项目说明
```

---

## public 目录

静态资源，直接复制到构建输出目录。

```
public/
├── logo.svg              # 应用 Logo
├── favicon.ico           # 网站图标
├── emergency-clear.js    # 紧急清空脚本
├── fix-quota-error.js    # 存储修复脚本
└── force-clear-tags.js   # 标签清空脚本
```

---

## src 目录

源代码主目录。

### api/

API 服务层，处理与后端的通信。

```
api/
├── auth.ts       # 认证相关 API
├── github.ts     # GitHub API 调用
├── backend.ts    # 后端 API
└── request.ts    # Axios 实例封装
```

### components/

公共可复用组件。

```
components/
└── (公共组件)
```

### config/

配置文件。

```
config/
├── ai.ts          # AI 服务配置
├── categories.ts  # 预设分类配置
└── oauth.ts       # GitHub OAuth 配置
```

**ai.ts** - AI 服务配置：
- 支持的 AI 平台
- 默认模型和 API 地址
- 配置读取和保存

**categories.ts** - 预设分类：
- 18 种默认分类
- 每个分类的名称、Emoji、颜色、关键词

### db/

数据库配置。

```
db/
└── index.ts    # Dexie 数据库定义
```

定义了三个表：
- `repos` - 仓库数据
- `tags` - 标签数据
- `repoTags` - 关联数据

### i18n/

国际化配置。

```
i18n/
├── index.ts        # i18n 实例
└── locales/
    ├── zh.ts       # 中文语言包
    └── en.ts       # 英文语言包
```

### layouts/

布局组件。

```
layouts/
└── HomeLayout.vue   # 主页布局（包含顶部导航）
```

### pages/

页面组件，与路由对应。

```
pages/
├── Login.vue        # 登录页
├── Home/
│   ├── index.vue    # 主页
│   └── components/
│       ├── SideMenu.vue      # 左侧标签菜单
│       ├── RepoList.vue      # 仓库列表
│       ├── RepoCard.vue      # 仓库卡片
│       ├── DetailView.vue    # 详情面板
│       ├── BatchTagDialog.vue # 批量标签对话框
│       └── EmptyState.vue    # 空状态
└── Settings/
    └── index.vue    # 设置页
```

### router/

路由配置。

```
router/
└── index.ts    # Vue Router 配置
```

路由结构：
- `/login` - 登录页
- `/` - 主页（需要登录）
- `/settings` - 设置页（需要登录）

### services/

业务服务层。

```
services/
└── ai.ts    # AI 分类服务
```

包含：
- AI API 调用封装
- 批量分类逻辑
- 结果解析

### stores/

Pinia 状态管理。

```
stores/
├── repo.ts    # 仓库状态
├── tag.ts     # 标签状态
├── theme.ts   # 主题和语言状态
└── user.ts    # 用户状态
```

**repo.ts**：
- 仓库列表
- 同步状态
- 搜索筛选

**tag.ts**：
- 标签列表
- 标签 CRUD
- 仓库-标签关联

**theme.ts**：
- 当前主题（dark/light）
- 当前语言（zh/en）

**user.ts**：
- 用户信息
- 登录状态
- Token 管理

### styles/

全局样式。

```
styles/
├── main.scss       # 主样式文件
└── variables.scss  # SCSS 变量
```

**variables.scss** 包含：
- 颜色变量
- 间距变量
- 字体变量
- 主题变量（浅色/深色）

### types/

TypeScript 类型定义。

```
types/
└── index.ts    # 类型定义
```

主要类型：
- `Repo` - 仓库
- `Tag` - 标签
- `User` - 用户

### utils/

工具函数。

```
utils/
├── index.ts           # 通用工具
├── auth.ts            # 认证工具
└── languageColors.ts  # 编程语言颜色
```

---

## server 目录

本地开发用的 OAuth 代理服务器。

```
server/
├── dev-server.js    # Express 服务器
└── package.json     # 依赖配置
```

---

## functions 目录

Cloudflare Workers 函数。

```
functions/
├── api/
│   └── getToken.ts  # OAuth Token 交换
└── tsconfig.json
```

---

## 文件命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| Vue 组件 | PascalCase | `RepoCard.vue` |
| TypeScript | camelCase | `languageColors.ts` |
| 样式文件 | kebab-case | `main.scss` |
| 目录 | kebab-case | `repo-list/` |

