# 本地安装与开发

StarHub 本地开发需要同时运行 Vue 前端和 Cloudflare Pages Functions。仅运行 `npm run dev` 可以查看部分界面，但无法完成 GitHub OAuth 登录。

## 环境要求

| 依赖 | 要求 |
|---|---|
| Node.js | 使用 `.nvmrc`，当前为 22.x |
| npm | 10+ |
| 浏览器 | 支持 IndexedDB、Web Crypto、Web Workers 和 ES Modules |
| GitHub OAuth App | 本地专用，callback 为 `http://localhost:5173/` |

## 1. 获取代码与依赖

```bash
git clone https://github.com/hujinghaoabcd/StarHub.git
cd StarHub
npm ci
```

日常开发使用 `npm ci` 保持与 `package-lock.json` 一致。只有主动升级依赖时使用 `npm install`，并在 PR 中说明 lockfile 变化。

## 2. 创建本地 OAuth App

GitHub OAuth App 设置：

```text
Homepage URL: http://localhost:5173/
Authorization callback URL: http://localhost:5173/
```

生产与本地使用不同 callback，应创建两个 App，不要来回修改同一个生产 App。

## 3. 配置服务端变量

```bash
cp .dev.vars.example .dev.vars
```

编辑未提交的 `.dev.vars`：

```ini
CLIENT_ID=your_local_client_id
CLIENT_SECRET=your_local_client_secret
ALLOWED_ORIGINS=http://localhost:5173
GITHUB_REDIRECT_URI=http://localhost:5173/
```

## 4. 配置浏览器 Client ID

创建未提交的 `.env.local`：

```ini
VITE_GITHUB_CLIENT_ID=your_local_client_id
```

Client ID 必须与 `.dev.vars` 属于同一个 App。不要创建 `VITE_CLIENT_SECRET`：所有 `VITE_*` 变量都会进入浏览器构建产物。

本地通过 Vite `/api` 代理访问 Functions，不需要设置 `VITE_API_BASE_URL`。

## 5. 启动

```bash
# 终端 1：Functions，默认 8788
npm run cloudflare:dev

# 终端 2：前端，默认 5173
npm run dev
```

访问：

- 应用：<http://localhost:5173/>
- OAuth 健康检查：<http://localhost:8788/api/health>
- 文档开发服务器：执行 `npm run docs:dev` 后访问 <http://localhost:5174/>

如果 5173 被占用，Vite 可能选择其他端口，但 OAuth callback 和 `ALLOWED_ORIGINS` 不会自动改变。开发 OAuth 时应释放 5173，或同时修改 App 和变量。

## 6. 开发前验证

```bash
npm run check
```

常用子命令：

| 命令 | 用途 |
|---|---|
| `npm run lint` | ESLint，警告也会导致失败 |
| `npm run type-check` | Vue/TypeScript 类型检查 |
| `npm run test:unit` | Node 单元测试 |
| `npm run docs:build` | 单独检查 VitePress 文档和死链 |
| `npm run pages:build` | 构建 Pages 应用与文档组合包 |
| `npm run cloudflare:type-check` | Functions 类型检查 |
| `npm run cloudflare:build` | 生成 Cloudflare Pages 输出 |
| `npm run security:verify` | 校验静态安全策略 |
| `npm run audit:production` | 审计生产依赖 |

## 7. 本地数据隔离

开发数据位于当前 Origin 的 IndexedDB。同一端口下不同分支会共用数据；调试数据库迁移前先从设置页导出备份。无痕窗口适合做干净安装验证，但关闭无痕窗口后数据会被浏览器删除。

下一步阅读：[OAuth 工作原理](oauth.md)、[数据管理](../config/data.md)和[贡献指南](../CONTRIBUTING.md)。

## English quick start

1. Install Node 22 and run `npm ci`.
2. Create a separate OAuth App with both local URLs set to `http://localhost:5173/`.
3. Copy `.dev.vars.example` to `.dev.vars` and provide `CLIENT_ID`, `CLIENT_SECRET`, `ALLOWED_ORIGINS`, and `GITHUB_REDIRECT_URI`.
4. Put the same Client ID in uncommitted `.env.local` as `VITE_GITHUB_CLIENT_ID`.
5. Run `npm run cloudflare:dev` and `npm run dev` in separate terminals.
6. Run `npm run check` before opening a pull request.

Never place the Client Secret in a `VITE_*` variable or commit `.dev.vars`.
