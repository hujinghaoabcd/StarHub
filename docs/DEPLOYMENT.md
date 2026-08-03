# 生产部署与发布手册

本文是 StarHub 的部署主文档。生产环境采用职责分离架构：

```text
浏览器
  ├─ GitHub Pages：Vue 应用 /StarHub/
  ├─ GitHub Pages：VitePress 文档 /StarHub/docs/
  ├─ GitHub API：同步 Stars、README 与取消 Star
  ├─ AI 供应商 API：用户主动配置后进行分类
  └─ Cloudflare Pages Functions：仅处理 GitHub OAuth code 交换
```

Cloudflare 不保存用户仓库数据，GitHub Pages 也没有数据库。仓库、分类、重点标记和 AI 任务均保存在用户浏览器的 IndexedDB。

## 1. 前置要求

| 项目 | 要求 |
|---|---|
| Node.js | `.nvmrc` 指定版本，当前为 22.x |
| npm | 与 Node.js 22 配套的 npm 10+ |
| GitHub 仓库 | 已启用 Actions 与 Pages（Source 选择 GitHub Actions） |
| GitHub OAuth App | 生产环境专用，不与本地开发共用 |
| Cloudflare Pages | 连接同一仓库，用于部署 `functions/` |

## 2. 配置生产 GitHub OAuth App

在 GitHub `Settings → Developer settings → OAuth Apps` 新建应用。当前官方实例使用：

```text
Homepage URL:
https://hujinghaoabcd.github.io/StarHub/

Authorization callback URL:
https://hujinghaoabcd.github.io/StarHub/
```

注意：

- 回调必须包含末尾的 `/StarHub/`；
- 不要写 `#/login`，URL fragment 不会发送到 OAuth 服务端；
- 本地开发应创建另一套 OAuth App；
- Client ID 可以公开，Client Secret 只能放在 Cloudflare Secret 中。

## 3. 部署 Cloudflare OAuth API

在 Cloudflare `Workers & Pages → Create → Pages → Connect to Git` 连接仓库：

| 设置 | 值 |
|---|---|
| Production branch | `main` |
| Build command | `npm run cloudflare:build` |
| Build output directory | `cloudflare-dist` |
| Root directory | `/` |
| Node.js | `22` |

仓库根目录的 Pages Functions 映射为：

| 源文件 | 生产路由 | 用途 |
|---|---|---|
| `functions/api/health.ts` | `GET /api/health` | 检查服务和变量是否配置 |
| `functions/api/oauth/token.ts` | `POST /api/oauth/token` | 使用 PKCE 与 Client Secret 交换 token |

Production 环境变量：

| 名称 | 类型 | 官方实例值或说明 |
|---|---|---|
| `CLIENT_ID` | Text | 生产 OAuth App Client ID |
| `CLIENT_SECRET` | **Encrypted secret** | 生产 OAuth App Client Secret |
| `ALLOWED_ORIGINS` | Text | `https://hujinghaoabcd.github.io` |
| `GITHUB_REDIRECT_URI` | Text | `https://hujinghaoabcd.github.io/StarHub/` |

变量修改后必须重新部署。验证：

```text
https://starhub-oauth.pages.dev/api/health
```

正常响应包含 `"status":"ok"` 和 `"configured":true`。健康检查不会返回任何 Secret。

## 4. 配置 GitHub Actions Variables

在仓库 `Settings → Secrets and variables → Actions → Variables` 添加：

```text
VITE_API_BASE_URL=https://starhub-oauth.pages.dev/api
VITE_GITHUB_CLIENT_ID=<生产 OAuth App Client ID>
```

两者都进入公开的前端构建产物，因此不得放入 Client Secret。`VITE_GITHUB_CLIENT_ID` 必须与 Cloudflare 的 `CLIENT_ID` 属于同一个 OAuth App。

## 5. GitHub Pages 构建过程

`.github/workflows/deploy-pages.yml` 在 Pull Request 上只构建，在 `main` 上构建、上传、部署并执行公网冒烟测试。`npm run pages:build` 会：

1. 以 `VITE_BASE_PATH=/StarHub/` 构建 Vue 应用；
2. 以 `VITEPRESS_BASE_PATH=/StarHub/docs/` 构建文档；
3. 将文档复制到 `dist/docs/`；
4. 写入 `.nojekyll`；
5. 生成含构建提交 SHA 的 `deployment-info.json`。

正式地址：

- 应用：<https://hujinghaoabcd.github.io/StarHub/>
- 文档：<https://hujinghaoabcd.github.io/StarHub/docs/>
- 部署标识：<https://hujinghaoabcd.github.io/StarHub/deployment-info.json>

## 6. 标准发布流程

1. 从最新 `main` 创建短生命周期分支；
2. 完成功能、测试、中文和英文文案、文档与变更日志；
3. 本地运行 `npm run check`；
4. 创建 Pull Request，等待 CI 与 Pages 构建检查；
5. 处理检查或审查意见后 squash merge；
6. 等待 `main` 的 `CI` 和 `Deploy GitHub Pages` 全部成功；
7. 检查 `deployment-info.json` 的 `commit` 等于合并后的提交；
8. 使用无痕窗口执行本批人工验收；
9. 涉及 OAuth 时额外检查 `/api/health` 并完成一次真实登录；
10. 涉及数据库时用旧版浏览器数据验证原地升级、导出和回滚。

`npm run check` 当前覆盖 ESLint、前端与 Functions 类型检查、单元测试、OAuth 文档校验、Pages 构建、CSP、静态安全规则、生产依赖审计和 Cloudflare 构建。

## 7. 数据库发布门槛

涉及 `src/db/index.ts` 或持久化结构的版本，必须检查：

- Dexie schema 版本只向前增加；
- `repos`、`tags`、`repoTags` 原地升级后数量和关系正确；
- 分类重命名不改变稳定 ID；
- 分类合并完整迁移 `repoTags` 且不产生重复关系；
- 重点标记、正式注册表和迁移快照可读取；
- 当前格式备份可导出并在干净浏览器导入；
- 失败事务不留下半写入状态；
- 页面刷新后任务、审核草稿和回滚快照仍然可用。

当前数据库为 IndexedDB v8，备份格式为 v4，正式分类元数据为 schema v2。已知限制是“完整备份导入”和“清空全部数据”尚未清理三个 AI 历史表，详见[数据管理](config/data.md#已知限制)。

## 8. 回滚

静态前端回滚应通过 Git 提交和新的 Pages 部署完成，不要直接修改构建产物。数据库 schema 不支持简单降级，因此：

1. 发布 schema 变化前保留浏览器数据备份；
2. 修复版本继续向前升级，不降低 Dexie 版本；
3. 分类治理操作优先使用内置迁移快照撤销；
4. 若生产构建故障，回退应用代码后仍需验证新数据库能被旧界面安全读取；
5. OAuth 后端可在 Cloudflare 中回滚到上一个部署，但变量仍应逐项复核。

## 9. 安全验收

- Client Secret 不在仓库、Actions Variables、构建产物、浏览器存储和日志中；
- token 交换只接受 JSON `POST`；
- OAuth `state` 与 PKCE S256 生效；
- Origin 和 redirect URI 使用精确白名单，不使用 `*`；
- token 响应与错误响应禁止缓存；
- 登录回调处理完成后 URL 不残留 `code` 和 `state`；
- AI 自定义地址必须为公网 HTTPS，且界面明确显示目标主机；
- Pages 响应使用项目定义的 CSP，不依赖 `unsafe-eval`。

## 10. 部署故障快速定位

| 现象 | 首要检查 |
|---|---|
| 页面空白或资源 404 | `VITE_BASE_PATH`、Pages 根路径和 HTML 中资源前缀 |
| 文档 404 | `VITEPRESS_BASE_PATH` 与 `/StarHub/docs/` |
| 登录按钮报未配置 | Actions 的 `VITE_GITHUB_CLIENT_ID` |
| `/api/health` 未配置 | Cloudflare 四个变量及重新部署 |
| `redirect_uri_mismatch` | OAuth App 与 `GITHUB_REDIRECT_URI` 是否逐字符一致 |
| CORS 拒绝 | `ALLOWED_ORIGINS` 只写 Origin，不带路径和尾斜杠 |
| main 已合并但页面还是旧版 | Actions 状态和 `deployment-info.json` 的提交 SHA |

进一步排查见[故障排除](TROUBLESHOOTING.md)。Cloudflare 细节见[OAuth 后端部署](deploy/cloudflare.md)，自有域名见[自托管](deploy/self-host.md)。
