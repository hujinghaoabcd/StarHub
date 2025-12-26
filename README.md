<p align="center">
  <img src="public/logo.svg" alt="StarHub Logo" width="120" height="120">
</p>

<h1 align="center">StarHub</h1>

<p align="center">
  <strong>🌟 专业的 GitHub Stars 管理工具</strong>
</p>

<p align="center">
  <em>让你的 GitHub Star 收藏井井有条，再也不怕找不到好项目</em>
</p>

<p align="center">
  <a href="https://github.com/hujinghaoabcd/StarHub/stargazers"><img src="https://img.shields.io/github/stars/hujinghaoabcd/StarHub?style=flat&logo=github" alt="GitHub Stars"></a>
  <a href="https://github.com/hujinghaoabcd/StarHub/blob/main/LICENSE"><img src="https://img.shields.io/github/license/hujinghaoabcd/StarHub?style=flat" alt="License"></a>
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/vue-3.4-4FC08D?style=flat&logo=vue.js" alt="Vue.js">
  <img src="https://img.shields.io/badge/typescript-5.4-3178C6?style=flat&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/vite-5.1-646CFF?style=flat&logo=vite" alt="Vite">
</p>

<p align="center">
  <a href="#项目简介">项目简介</a> •
  <a href="#功能特性">功能特性</a> •
  <a href="#在线演示">在线演示</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#部署指南">部署指南</a> •
  <a href="#使用说明">使用说明</a> •
  <a href="#技术栈">技术栈</a>
</p>

---

<a id="项目简介"></a>
## 📖 项目简介

**StarHub** 是一款专为开发者设计的 GitHub Stars 管理应用。当你的 Star 数量达到数百甚至上千时，找到真正需要的项目变得异常困难。StarHub 正是为解决这个问题而生——它不仅同步你的所有 Star 仓库，还提供强大的分类、搜索和 AI 智能归类功能，让你的技术收藏真正发挥价值。

### 🎯 解决的痛点

- ❌ Star 了很多优秀项目，但需要时找不到
- ❌ GitHub 原生的 Star 列表只能按时间排序，没有分类功能
- ❌ 手动整理分类太耗时，难以坚持
- ❌ 收藏的项目越来越多，越来越混乱

### ✅ StarHub 的解决方案

- ✨ **智能标签系统** - 自定义分类，支持 Emoji 和颜色
- 🤖 **AI 自动分类** - 一键智能归类，省时省力
- ⚡ **极速搜索** - 毫秒级响应，精准定位
- 📖 **README 预览** - 无需跳转，快速了解项目
- 🔒 **本地存储** - 数据安全，隐私可控

---

<a id="功能特性"></a>
## ✨ 功能特性

### 🏷️ 智能标签系统

- **自定义标签**：创建任意数量的标签，自由组织你的收藏
- **Emoji 图标**：每个标签支持设置 Emoji，一目了然
- **颜色标识**：18 种预设颜色，视觉区分更清晰
- **多标签支持**：一个仓库可添加多个标签，灵活分类
- **批量操作**：支持批量为仓库添加/移除标签

### 🤖 AI 智能分类

支持多种主流 AI 服务：

| 服务商 | 默认模型 | 说明 |
|--------|----------|------|
| OpenAI | gpt-4o-mini | 性价比高，推荐使用 |
| Claude | claude-3-5-sonnet | 理解能力强 |
| DeepSeek | deepseek-chat | 国产模型，速度快 |
| 通义千问 | qwen-plus | 阿里云，中文友好 |
| 智谱 AI | glm-4-flash | 国产模型，免费额度 |

**AI 分类特性：**
- 支持读取 README 深度理解项目内容
- 可配置批次大小（默认 50 个/批）
- 支持仅分类未分类仓库或全部重新分类
- 分类准确率高达 95%+

### 🔍 全文即时搜索

- **多维度搜索**：支持仓库名、描述、编程语言等搜索
- **本地存储**：基于 IndexedDB，毫秒级响应
- **标签筛选**：可按标签过滤结果
- **实时高亮**：搜索结果实时高亮显示

### 📖 README 即时预览

- 完整的 Markdown 渲染，支持 GFM 扩展
- 代码语法高亮（100+ 种语言）
- 图片、表格、链接完美显示
- 无需跳转 GitHub 即可快速了解项目

### 🌓 深色模式 & 多语言

- 精心设计的深色/浅色主题
- 支持跟随系统偏好自动切换
- 完整的中英文双语支持
- 界面语言可随时切换

### 📱 PWA 离线应用

- 支持安装到桌面，类原生应用体验
- 数据本地存储，离线状态下也能浏览和搜索
- 同步一次，随时可用

---

## 🏷️ 预设分类

StarHub 内置 18 种专业分类，覆盖主流技术领域：

| 分类 | 说明 | 分类 | 说明 |
|------|------|------|------|
| 🌐 Web 开发 | 前端、后端、全栈 | 📱 移动开发 | iOS、Android、跨平台 |
| 🤖 数据科学 | ML、AI、数据分析 | 🛠️ 工具库 | 通用工具、库、框架 |
| ⚙️ DevOps | CI/CD、容器化 | 🎮 游戏开发 | 游戏引擎、游戏工具 |
| 💾 数据库 | SQL、NoSQL、ORM | 🔒 安全 | 网络安全、加密 |
| ⛓️ 区块链 | Web3、智能合约 | 💻 编程语言 | 编译器、解释器 |
| ⚡ 系统编程 | OS、底层开发 | 🎨 设计 | UI/UX、图形处理 |
| 📚 文档 | 文档生成、知识管理 | 🧪 测试 | 测试框架、自动化 |
| 😎 Awesome | 精选资源列表 | 🟢 Node.js | Node 生态系统 |
| ⚛️ React | React 生态系统 | 📦 其他 | 未分类项目 |

---

<a id="在线演示"></a>
## 🌐 在线演示

> 下面是部分应用界面截图，完整体验请本地运行或等待在线演示开放。

<p align="center">
  <img src="./public/screenshot-01.png" style="max-width: 600px; box-shadow:0 2px 12px #0002" />
</p>
<p align="center">
  登录界面
</p>
<p align="center">
  <img src="./public/screenshot-02.png"  style="max-width: 600px; box-shadow:0 2px 12px #0002" />
</p>
<p align="center">
  系统主页
</p>
<p align="center">
  <img src="./public/screenshot-03.png" style="max-width: 600px; box-shadow:0 2px 12px #0002" />
</p>
<p align="center">
  文档界面
</p>


> 🚧 在线演示正在准备中，敬请期待！

如果你已经部署了 StarHub，可以通过以下方式访问：

- **本地开发**: `http://localhost:5173`
- **生产环境**: 根据你的部署平台访问对应域名

---

<a id="快速开始"></a>
## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0 或 **yarn** >= 1.22.0

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/hujinghaoabcd/StarHub.git
cd StarHub

# 2. 安装依赖
npm install

# 3. 配置 GitHub OAuth（见下方说明）

# 4. 启动开发服务器
npm run dev

# 5. 访问 http://localhost:5173
```

### GitHub OAuth 配置

StarHub 需要通过 GitHub OAuth 获取你的 Star 数据。请按以下步骤配置：

#### 第一步：创建 GitHub OAuth App

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 **New OAuth App**
3. 填写应用信息：
   - **Application name**: `StarHub`（或任意名称）
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5173/#/login`
4. 点击 **Register application**
5. 记录 **Client ID**
6. 点击 **Generate a new client secret**，记录 **Client Secret**

#### 第二步：配置项目

1. 复制 `src/config/oauth.ts` 中的模板，更新 `CLIENT_ID`：

```typescript
export const GITHUB_OAUTH_CONFIG = {
  CLIENT_ID: 'your_client_id_here'
}
```

2. 创建 `.env` 文件（本地开发用）：

```env
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
```

#### 第三步：启动本地开发服务器

```bash
# 启动 OAuth 代理服务器
node server/dev-server.js

# 在另一个终端启动前端开发服务器
npm run dev
```

---

<a id="部署指南"></a>
## 📦 部署指南

### 方式一：Cloudflare Pages（推荐）

Cloudflare Pages 提供免费托管，并支持 Cloudflare Workers 处理 OAuth。

#### 1. 构建项目

```bash
npm run build
```

#### 2. 部署到 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** > **Create a project**
3. 连接 GitHub 仓库或直接上传 `dist` 目录
4. 设置构建配置：
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

#### 3. 配置 Cloudflare Workers

在 `functions/api/getToken.ts` 中已提供 OAuth token 交换逻辑。需要在 Cloudflare Dashboard 中设置环境变量：

- `CLIENT_ID`: GitHub OAuth Client ID
- `CLIENT_SECRET`: GitHub OAuth Client Secret

#### 4. 更新 OAuth 回调地址

在 GitHub OAuth App 设置中，将回调地址更新为你的 Cloudflare Pages 域名：

```
https://your-project.pages.dev/#/login
```


### 方式二：自托管

```bash
# 构建
npm run build

# 使用任意静态服务器托管 dist 目录
# 例如使用 nginx、Apache 或 Node.js 静态服务器

# 预览生产构建
npm run preview
```

> ⚠️ **注意**：自托管需要自行处理 OAuth token 交换的后端逻辑。可参考 `server/dev-server.js` 或 `functions/api/getToken.ts`。

---

<a id="使用说明"></a>
## 📖 使用说明

### 登录

1. 点击 **使用 GitHub 登录** 按钮
2. 在弹出窗口中授权 StarHub 访问你的 GitHub 账户
3. 授权成功后自动跳转到主页

### 同步仓库

- 首次登录会自动开始同步你的所有 Star 仓库
- 同步进度会在右上角显示
- 支持增量同步（仅获取新增的 Star）

### 使用标签分类

#### 手动分类

1. 在仓库列表中点击任意仓库
2. 在右侧详情面板中点击 **添加标签**
3. 选择已有标签或创建新标签

#### 批量分类

1. 在仓库列表顶部点击 **选择** 按钮
2. 勾选要分类的仓库
3. 点击 **批量设置分类** 按钮
4. 选择要添加的标签

#### AI 自动分类

1. 进入 **设置** 页面
2. 配置 AI 服务（API Key、模型等）
3. 返回主页，点击左侧 **AI 智能分类** 按钮
4. 选择分类模式：
   - **仅未分类**：只为没有标签的仓库分类
   - **重新分类所有**：清空现有分类，全部重新分类
5. 等待分类完成

### 搜索仓库

- 在顶部搜索框输入关键词
- 支持按仓库名、描述、编程语言搜索
- 点击左侧标签可筛选特定分类

### 查看详情

- 点击任意仓库查看详情面板
- 包含仓库基本信息、编程语言、Star/Fork 数等
- 点击 **查看 README** 可在应用内预览 README

### 设置

访问 **设置** 页面可配置：

- **AI 服务配置**：选择 AI 服务商、配置 API Key
- **分类批次大小**：调整每批 AI 分类的仓库数量
- **是否读取 README**：开启后 AI 会读取 README 进行更准确的分类
- **数据管理**：清空数据、重新同步

---

<a id="技术栈"></a>
## 🛠️ 技术栈

### 前端框架

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue 3 | ^3.4 | 组合式 API，响应式系统 |
| TypeScript | ~5.4 | 类型安全，更好的开发体验 |
| Vite | ^5.1 | 极速构建，HMR 热更新 |
| Pinia | ^2.1 | 直观的状态管理 |
| Vue Router | ^4.3 | 官方路由管理 |
| Vue I18n | ^9.14 | 国际化支持 |

### UI 组件

| 技术 | 版本 | 说明 |
|------|------|------|
| Element Plus | ^2.5 | Vue 3 组件库 |
| SCSS | ^1.71 | CSS 预处理器 |

### 数据存储

| 技术 | 版本 | 说明 |
|------|------|------|
| Dexie.js | ^3.2 | IndexedDB 封装库 |
| IndexedDB | - | 浏览器本地数据库 |

### Markdown 渲染

| 技术 | 版本 | 说明 |
|------|------|------|
| Marked | ^17.0 | Markdown 解析器 |
| highlight.js | ^11.10 | 代码语法高亮 |
| DOMPurify | ^3.0 | XSS 防护 |
| GitHub Markdown CSS | ^5.8 | GitHub 风格样式 |

### 其他依赖

| 技术 | 说明 |
|------|------|
| Axios | HTTP 请求库 |
| vue-virtual-scroller | 虚拟滚动，支持大量数据 |
| query-string | URL 查询字符串解析 |

---

## 📁 项目结构

```
StarHub/
├── public/                   # 静态资源
│   ├── logo.svg             # 应用 Logo
│   ├── favicon.ico          # 网站图标
│   └── *.js                 # 工具脚本（清理、修复等）
├── src/                     # 源代码目录
│   ├── api/                 # API 服务层
│   │   ├── auth.ts          # 认证 API
│   │   ├── backend.ts       # 后端 API
│   │   ├── github.ts        # GitHub API
│   │   └── request.ts       # Axios 封装
│   ├── config/              # 配置文件
│   │   ├── ai.ts            # AI 服务配置
│   │   ├── categories.ts    # 预设分类配置
│   │   └── oauth.ts         # OAuth 配置
│   ├── db/                  # 数据库
│   │   └── index.ts         # Dexie 数据库定义
│   ├── i18n/                # 国际化
│   │   ├── index.ts         # i18n 配置
│   │   └── locales/         # 语言包
│   │       ├── zh.ts        # 中文
│   │       └── en.ts        # 英文
│   ├── layouts/             # 布局组件
│   │   └── HomeLayout.vue   # 主布局
│   ├── pages/               # 页面组件
│   │   ├── Login.vue        # 登录页
│   │   ├── Home/            # 主页
│   │   │   ├── index.vue    # 主页入口
│   │   │   └── components/  # 主页子组件
│   │   │       ├── BatchTagDialog.vue    # 批量标签对话框
│   │   │       ├── DetailView.vue        # 详情视图
│   │   │       ├── EmptyState.vue        # 空状态
│   │   │       ├── RepoCard.vue          # 仓库卡片
│   │   │       ├── RepoCardTags.vue      # 仓库标签
│   │   │       ├── RepoList.vue          # 仓库列表
│   │   │       └── SideMenu.vue          # 侧边菜单
│   │   └── Settings/         # 设置页
│   │       └── index.vue    # 设置入口
│   ├── router/              # 路由配置
│   │   └── index.ts         # Vue Router 配置
│   ├── services/            # 业务服务
│   │   └── ai.ts            # AI 分类服务
│   ├── stores/              # 状态管理
│   │   ├── repo.ts          # 仓库状态
│   │   ├── tag.ts           # 标签状态
│   │   ├── theme.ts         # 主题状态
│   │   └── user.ts          # 用户状态
│   ├── styles/              # 全局样式
│   │   ├── main.scss        # 主样式文件
│   │   └── variables.scss   # SCSS 变量
│   ├── types/               # TypeScript 类型
│   │   └── index.ts         # 类型定义
│   ├── utils/               # 工具函数
│   │   ├── auth.ts          # 认证工具
│   │   ├── index.ts         # 通用工具
│   │   └── languageColors.ts # 编程语言颜色
│   ├── App.vue              # 根组件
│   └── main.ts              # 应用入口
├── docs/                    # 文档目录
│   ├── config/              # 配置文档
│   ├── deploy/              # 部署文档
│   ├── guide/               # 使用指南
│   ├── reference/           # 参考文档
│   └── troubleshooting/     # 故障排除
├── server/                  # 本地开发服务器
│   ├── dev-server.js        # OAuth 代理服务器
│   └── package.json         # 服务器依赖
├── functions/               # Workers
│   ├── api/
│   │   └── getToken.ts      # OAuth Token 交换
│   └── tsconfig.json        # TypeScript 配置
├── backups/                 # 备份文件
├── package.json             # 项目配置
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
├── tsconfig.node.json       # Node.js TypeScript 配置
├── index.html               # HTML 入口
├── LICENSE                  # 开源协议
├── CHANGELOG.md             # 更新日志
├── CONTRIBUTING.md          # 贡献指南
└── README.md                # 项目文档
```

---

## ❓ 常见问题

<!-- ### 存储空间不足错误 (QuotaExceededError)

如果遇到 `QuotaExceededError` 或 "存储空间已满" 错误：

**快速修复：**

```javascript
// 在浏览器控制台（F12）运行
fetch('/fix-quota-error.js').then(r => r.text()).then(eval);
```

**手动清理：**

1. 打开开发者工具 (F12)
2. 进入 **Application** > **Storage** > **IndexedDB**
3. 右键删除 `StarHubDB` 数据库
4. 刷新页面

### 清空数据后仍有遗留

**快速修复：**

```javascript
// 在浏览器控制台（F12）运行
fetch('/force-clear-tags.js').then(r => r.text()).then(eval);
```

**完整清理脚本：**

```javascript
fetch('/emergency-clear.js').then(r => r.text()).then(eval);
``` -->

### OAuth 登录失败

1. 检查 `CLIENT_ID` 是否正确配置
2. 确认 GitHub OAuth App 的回调地址与当前地址匹配
3. 本地开发确保 `node server/dev-server.js` 正在运行
4. 检查 `.env` 文件中的 `CLIENT_SECRET` 是否正确

### AI 分类失败

1. 确认 API Key 配置正确
2. 检查 API 余额/配额是否充足
3. 尝试减小批次大小（设置页面可调整）
4. 检查网络连接

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'Add some feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 提交 Pull Request

### 开发规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 规则
- 组件使用 Vue 3 组合式 API
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Element Plus](https://element-plus.org/) - Vue 3 组件库
- [Dexie.js](https://dexie.org/) - IndexedDB 封装库
- [Marked](https://marked.js.org/) - Markdown 解析器
- 所有贡献者和用户

---

<p align="center">
  如果这个项目对你有帮助，请给一个 ⭐ Star 支持一下！
</p>
