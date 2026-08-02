# 快速安装

本节介绍如何在本地安装和运行 StarHub。

## 环境要求

| 依赖 | 最低版本 | 推荐版本 |
|---|---:|---:|
| Node.js | 22.12.0 | 22.x LTS |
| npm | 10 | 随 Node.js 22 提供的版本 |
| 浏览器 | 支持 Web Crypto、IndexedDB 与 ES Modules | 最新稳定版 |

## 安装步骤

### 1. 克隆仓库

```bash
git clone https://github.com/hujinghaoabcd/StarHub.git
cd StarHub
```

### 2. 安装锁定依赖

```bash
npm ci
```

日常开发优先使用 `npm ci`，确保安装结果与 `package-lock.json` 一致。只有明确升级依赖时才使用 `npm install` 并提交对应 lockfile。

### 3. 创建本地 GitHub OAuth App

```text
Homepage URL: http://localhost:5173/
Authorization callback URL: http://localhost:5173/
```

本地 App 应与生产 App 分开，因为 GitHub OAuth App 只能配置一个 callback URL。

### 4. 配置服务端变量

```bash
cp .dev.vars.example .dev.vars
```

编辑 `.dev.vars`：

```env
CLIENT_ID=your_local_client_id
CLIENT_SECRET=your_local_client_secret
ALLOWED_ORIGINS=http://localhost:5173
GITHUB_REDIRECT_URI=http://localhost:5173/
```

### 5. 配置浏览器 Client ID

创建未提交的 `.env.local`：

```env
VITE_GITHUB_CLIENT_ID=your_local_client_id
```

该值必须与 `.dev.vars` 中的 `CLIENT_ID` 完全一致。Client Secret 不得写入任何 `VITE_*` 变量。

### 6. 启动两个进程

```bash
# 终端 1：Cloudflare Pages Functions，端口 8788
npm run cloudflare:dev

# 终端 2：Vite 前端，端口 5173
npm run dev
```

打开：

```text
http://localhost:5173/
```

健康检查：

```text
http://localhost:8788/api/health
```

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动 Vite 前端 |
| `npm run cloudflare:dev` | 构建并启动本地 Pages Functions |
| `npm run check` | 运行 Lint、类型检查、测试、OAuth/安全校验与全部构建 |
| `npm run test:unit` | 运行单元测试 |
| `npm run pages:build` | 构建 GitHub Pages 应用与文档 |
| `npm run cloudflare:build` | 构建 API-only Cloudflare Pages 输出 |
| `npm run audit:production` | 审计生产依赖 |

## 关键目录

```text
StarHub/
├── functions/        # Cloudflare Pages Functions
│   └── api/
│       ├── health.ts
│       └── oauth/token.ts
├── public/           # 静态资源
├── scripts/          # 构建与验证脚本
├── src/              # Vue 前端
├── tests/            # 单元测试
└── docs/             # VitePress 文档
```

下一步阅读：[GitHub OAuth 配置](oauth.md) 与 [本地 OAuth 开发](../development/local-oauth.md)。

---

# Quick Install (English)

## Requirements

| Dependency | Minimum | Recommended |
|---|---:|---:|
| Node.js | 22.12.0 | 22.x LTS |
| npm | 10 | Version bundled with Node.js 22 |
| Browser | Web Crypto, IndexedDB, and ES Modules support | Latest stable release |

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/hujinghaoabcd/StarHub.git
cd StarHub
```

### 2. Install locked dependencies

```bash
npm ci
```

Use `npm ci` for routine development so the installation matches `package-lock.json`. Use `npm install` only when intentionally changing dependencies and commit the resulting lockfile.

### 3. Create a local GitHub OAuth App

```text
Homepage URL: http://localhost:5173/
Authorization callback URL: http://localhost:5173/
```

Use a separate local App because a GitHub OAuth App supports only one callback URL.

### 4. Configure Function variables

```bash
cp .dev.vars.example .dev.vars
```

```env
CLIENT_ID=your_local_client_id
CLIENT_SECRET=your_local_client_secret
ALLOWED_ORIGINS=http://localhost:5173
GITHUB_REDIRECT_URI=http://localhost:5173/
```

### 5. Configure the browser Client ID

Create an uncommitted `.env.local` file:

```env
VITE_GITHUB_CLIENT_ID=your_local_client_id
```

It must match `CLIENT_ID` in `.dev.vars`. Never place the Client Secret in a `VITE_*` variable.

### 6. Start both processes

```bash
# Terminal 1: Cloudflare Pages Functions on port 8788
npm run cloudflare:dev

# Terminal 2: Vite on port 5173
npm run dev
```

Open `http://localhost:5173/`. The health endpoint is `http://localhost:8788/api/health`.

## Common commands

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite frontend |
| `npm run cloudflare:dev` | Build and start local Pages Functions |
| `npm run check` | Run lint, types, tests, OAuth/security verification, and all builds |
| `npm run test:unit` | Run unit tests |
| `npm run pages:build` | Build the GitHub Pages app and docs |
| `npm run cloudflare:build` | Build the API-only Cloudflare Pages output |
| `npm run audit:production` | Audit production dependencies |

Next: [GitHub OAuth Setup](oauth.md) and [Local OAuth Development](../development/local-oauth.md).
