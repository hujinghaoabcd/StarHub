# StarHub 开发交接文档

## 1. 交接信息

- 交接日期：2026-08-02
- 当前分支：`agent/foundation-ci-sync`
- 基准分支：`main`
- 草稿 PR：`#3 chore: establish CI baseline and development handoff`
- 当前阶段：工程基础、CI 基线、Pages 组合构建与部署工作流已完成
- 当前阻塞：仓库尚未首次启用 GitHub Pages
- 状态文档：`docs/development/PROJECT_STATUS.md`

## 2. 已完成批次

### 批次 1：工程基础与 CI 基线

已完成：

- 统一 Node.js 22；
- 建立 Vue、TypeScript、Node.js、Cloudflare Functions 的 ESLint 配置；
- 将 lint 改为非破坏性检查；
- 建立 `lint:fix`、`type-check`、`check`；
- 修复本地 OAuth 服务入口；
- 建立 GitHub Actions CI；
- 建立持续更新的状态和交接文档。

验证结果：

```text
npm ci             PASS
npm run lint       PASS，9 条非阻断警告
npm run type-check PASS
npm run build      PASS
```

### 批次 2：应用预览与文档同域部署

目标地址：

```text
应用：https://hujinghaoabcd.github.io/StarHub/
文档：https://hujinghaoabcd.github.io/StarHub/docs/
```

已完成：

- Vite 应用支持可配置基础路径，生产目标为 `/StarHub/`；
- VitePress 文档支持可配置基础路径，生产目标为 `/StarHub/docs/`；
- 登录页文档链接在生产环境指向同域文档目录；
- OAuth 回调地址保留项目路径前缀；
- 新增 `scripts/build-pages.mjs`；
- 新增 `npm run pages:build`；
- 应用构建输出到 `dist/`；
- 文档构建输出合并到 `dist/docs/`；
- 生成 `.nojekyll`；
- 生成 `deployment-info.json`；
- CI 改为验证完整 Pages 组合产物；
- 新增 GitHub Pages 构建、上传与部署工作流；
- PR 只做构建验证，分支推送才执行生产发布；
- 修复 push 与 pull_request 工作流可能互相取消的并发组问题；
- Pages 状态评论写入改为非阻断，避免仓库 Actions 写权限限制把构建标红；
- 增加 Pages 配置探测步骤。

## 3. Pages 构建结构

统一命令：

```bash
npm run pages:build
```

该命令执行：

1. 设置应用基础路径 `/StarHub/`；
2. 构建 Vue 应用；
3. 设置文档基础路径 `/StarHub/docs/`；
4. 构建 VitePress 文档；
5. 将文档复制到 `dist/docs/`；
6. 写入 `dist/.nojekyll`；
7. 写入 `dist/deployment-info.json`。

最终结构：

```text
dist/
├── index.html
├── assets/
├── logo.svg
├── .nojekyll
├── deployment-info.json
└── docs/
    ├── index.html
    ├── assets/
    └── ...
```

## 4. Pages 工作流

文件：

```text
.github/workflows/deploy-pages.yml
```

工作流事件：

- 推送到 `main`；
- 推送到 `agent/foundation-ci-sync`；
- 面向 `main` 的 Pull Request；
- 手动运行。

PR 事件：

- 构建应用与文档；
- 检查组合产物；
- 读取 Pages 配置；
- 不上传生产 artifact；
- 不执行生产部署。

push 或手动事件：

- 构建组合产物；
- `actions/configure-pages@v5`；
- `actions/upload-pages-artifact@v4`；
- `actions/deploy-pages@v4`；
- 将环境地址记录到 `github-pages` environment。

## 5. 验证结果

最新 PR 验证已通过：

```text
Install dependencies                 PASS
Build application and documentation PASS
Inspect GitHub Pages configuration   PASS（探测命令正常执行）
Configure GitHub Pages               SKIPPED（PR 事件设计如此）
Upload GitHub Pages artifact         SKIPPED（PR 事件设计如此）
Deploy Pages site                    SKIPPED（PR 事件设计如此）
```

联合构建输出确认：

```text
Application:   dist/      -> /StarHub/
Documentation: dist/docs/ -> /StarHub/docs/
```

曾出现一次失败：Vite 预处理插件把 `/logo.svg` 提前改成 `/StarHub/logo.svg`，Rollup 将其误判为源码模块。现已删除静态资源改写，让 Vite 原生处理 `public` 资源；随后联合构建通过。

## 6. 当前阻塞：Pages 尚未启用

Pages 探测请求：

```text
GET /repos/hujinghaoabcd/StarHub/pages
```

结果：

```text
HTTP 404 Not Found
```

工作流令牌在日志中显示具备：

```text
Pages: write
Contents: read
```

因此当前结论是：仓库尚未创建 GitHub Pages 站点，而不是应用或文档构建失败。

创建 Pages 站点要求同时具备：

- Pages repository permission：write；
- Administration repository permission：write。

Actions 的 `GITHUB_TOKEN` 不具备仓库 Administration 写权限，不能自动完成首次启用。

### 唯一一次人工操作

仓库管理员打开：

```text
StarHub → Settings → Pages
```

将：

```text
Build and deployment → Source
```

设置为：

```text
GitHub Actions
```

首次启用后，重新运行 `Deploy GitHub Pages`，后续提交即可自动部署。

## 7. 修改文件

本 PR 当前涉及：

- `.eslintrc.cjs`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-pages.yml`
- `.nvmrc`
- `package.json`
- `scripts/build-pages.mjs`
- `server/package.json`
- `tsconfig.json`
- `vite.config.ts`
- `docs/.vitepress/config.ts`
- `docs/development/PROJECT_STATUS.md`
- `docs/development/HANDOFF.md`

## 8. 已知风险与未完成项

### 在线部署

- Pages 尚未首次启用；
- 在线地址尚不能访问；
- 尚未执行浏览器级路由和静态资源验证；
- Pages 启用后应同时检查应用和文档。

### OAuth 与生产后端

- GitHub Pages 只能托管静态前端；
- `/api/getToken` 仍需要 Cloudflare Worker 或其他后端；
- OAuth 缺少 `state`；
- 回调仍使用 `window.opener` 全局函数；
- token 交换仍使用 GET 风格参数；
- GitHub token 仍存入 localStorage；
- 随机 `appToken` 无实际认证作用。

因此，即使 Pages 启用，当前在线地址也主要用于界面与文档预览，GitHub 登录暂不能视为生产可用。

### 构建与依赖

- `npm audit`：33 个漏洞，其中 19 个 high；
- ESLint：9 条非阻断警告；
- Element Plus 和 libs chunk 均超过 1 MB；
- 文档存在 `env` 语言回退提示；
- 文档存在 CSS nesting 兼容性警告。

### 仓库同步

当前同步仍会保留取消 Star 的旧仓库，尚未处理。

### 标签模型

`Tag.repos` 和 `repoTags` 仍是双轨模型，尚未迁移。

## 9. 下一步执行顺序

1. 管理员在 Settings → Pages 中启用 GitHub Actions；
2. 重新运行 `Deploy GitHub Pages`；
3. 验证应用 `/StarHub/`；
4. 验证文档 `/StarHub/docs/`；
5. 检查 logo、截图、CSS、JS、Hash Router 和文档导航；
6. 更新本交接文档与状态文档；
7. 提取仓库同步纯函数并增加测试；
8. 修复取消 Star 后仍残留的问题；
9. 开始 OAuth 安全重构；
10. 部署 Cloudflare Worker 后端。

## 10. 本地复现命令

```bash
nvm use
npm ci
npm run check
```

只构建 Pages 组合产物：

```bash
npm run pages:build
```

本地启动：

```bash
npm run server:dev
```

另一个终端：

```bash
npm run dev
```

OAuth 服务需要：

```text
CLIENT_ID=...
CLIENT_SECRET=...
```

## 11. 交接要求

后续每一批工作完成前必须：

- 更新 `PROJECT_STATUS.md` 的已完成与未完成清单；
- 更新本交接文档中的当前分支、修改文件、验证和下一步；
- 在 PR 描述中同步说明验证结果；
- 不把未经验证的高风险修改直接合并到 `main`；
- 不通过关闭质量检查来掩盖真实问题；
- 不把“构建成功”误报为“线上已经可访问”。
