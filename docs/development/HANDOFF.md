# StarHub 开发交接文档

## 1. 当前状态

StarHub 前端与文档已经由 GitHub Pages 正式发布：

```text
应用：https://hujinghaoabcd.github.io/StarHub/
文档：https://hujinghaoabcd.github.io/StarHub/docs/
```

OAuth 安全代码和 Cloudflare Pages Functions 路由已经准备完成并通过 CI，但 Cloudflare 项目、生产变量、Secret 和真实登录尚未配置或验证。

因此当前状态必须表述为：

> OAuth 后端代码已就绪，生产平台尚未部署。

## 2. 已完成的工程基础

### CI 与构建

- Node.js 22；
- Vue、TypeScript、Node.js 与 Cloudflare Functions ESLint/类型检查；
- 应用和 VitePress 文档联合构建；
- GitHub Actions CI；
- Cloudflare Functions 独立类型检查与构建；
- GitHub Pages 生产部署与公网冒烟测试。

### GitHub Pages

- 应用基础路径：`/StarHub/`；
- 文档基础路径：`/StarHub/docs/`；
- `.nojekyll`；
- 带构建 SHA 的 `deployment-info.json`；
- 生产发布仅从 `main` 执行；
- 每次发布自动验证应用、文档、SHA 与代表性静态资源。

## 3. OAuth 安全实现

### 浏览器端

- 回调地址使用应用根路径；
- 不再使用 `#/login` 作为 OAuth callback；
- 使用 Web Crypto 生成随机 `state`；
- 使用 PKCE S256；
- 回调时消费并删除 `state` 与 `code_verifier`；
- 弹窗通过 `postMessage` 返回 code/state；
- 校验 `event.origin`、`event.source` 和消息类型；
- 弹窗关闭时清理临时认证状态；
- code 使用 JSON POST 发送给后端；
- 生产环境缺少 API 地址时直接提示未配置；
- 401 跳转使用 `import.meta.env.BASE_URL`，不会丢失 `/StarHub/`。

### Cloudflare Pages Functions

路由：

```text
GET     /api/health
OPTIONS /api/oauth/token
POST    /api/oauth/token
```

安全措施：

- Client Secret 仅从 Cloudflare Secret 读取；
- Origin 严格白名单；
- CORS 预检；
- redirect URI 精确匹配；
- code 与 code verifier 格式校验；
- GitHub token 交换使用 `application/x-www-form-urlencoded` POST；
- 响应设置 `Cache-Control: no-store`；
- 不记录 code、secret 或 access token；
- 不再生成随机伪 appToken。

## 4. 构建命令

```bash
nvm use
npm ci
npm run lint
npm run type-check
npm run cloudflare:type-check
npm run pages:build
npm run cloudflare:build
```

统一检查：

```bash
npm run check
```

Cloudflare 本地预览：

```bash
cp .dev.vars.example .dev.vars
npm run cloudflare:dev
```

`.dev.vars` 不得提交。

## 5. 最终代码验证

```text
CI run                         30750815713  PASS
Pages PR build run             30750815708  PASS
npm ci                                      PASS
Lint                                        PASS，8 条既有非阻断警告
Frontend type-check                         PASS
Cloudflare Functions type-check             PASS
Application + documentation build           PASS
Cloudflare output build                      PASS
Pages configuration inspection               PASS
```

上述结果仅验证代码和构建，不等于 Cloudflare 线上服务已创建。

## 6. Cloudflare Pages 创建步骤

进入 Cloudflare Dashboard：

```text
Workers & Pages
→ Create
→ Pages
→ Connect to Git
→ GitHub
→ hujinghaoabcd/StarHub
```

构建配置：

```text
Production branch: main
Build command: npm run cloudflare:build
Build output directory: cloudflare-dist
Root directory: /
Node.js version: 22
```

仓库根目录的 `functions/` 会自动映射为 Pages Functions。

详细说明：`docs/deploy/cloudflare.md`。

## 7. Cloudflare Production Variables and Secrets

必须添加：

```text
CLIENT_ID=Ov23liIm4iNdpnHwGLfp
CLIENT_SECRET=<GitHub OAuth App Client Secret，Encrypt>
ALLOWED_ORIGINS=https://hujinghaoabcd.github.io
GITHUB_REDIRECT_URI=https://hujinghaoabcd.github.io/StarHub/
```

`CLIENT_SECRET` 不得写入源码、文档、聊天、Issue 或 Actions 日志。

保存后重新部署 Production。

## 8. GitHub OAuth App 配置

进入：

```text
GitHub
→ Settings
→ Developer settings
→ OAuth Apps
→ StarHub
```

设置：

```text
Homepage URL:
https://hujinghaoabcd.github.io/StarHub/

Authorization callback URL:
https://hujinghaoabcd.github.io/StarHub/
```

回调地址不得再填写：

```text
https://hujinghaoabcd.github.io/StarHub/#/login
```

本地开发应使用单独的 OAuth App，callback 为 `http://localhost:5173/`。

## 9. GitHub Actions Variables

Cloudflare 首次部署后会生成类似：

```text
https://starhub-oauth.pages.dev
```

进入 GitHub 仓库：

```text
Settings
→ Secrets and variables
→ Actions
→ Variables
```

添加：

```text
VITE_API_BASE_URL=https://实际项目.pages.dev/api
VITE_GITHUB_CLIENT_ID=Ov23liIm4iNdpnHwGLfp
```

然后重新运行 `Deploy GitHub Pages`，使 API 地址进入前端生产构建。

## 10. 生产验证标准

### 健康检查

访问：

```text
https://实际项目.pages.dev/api/health
```

必须返回：

```json
{
  "status": "ok",
  "service": "starhub-oauth",
  "configured": true
}
```

### OAuth 完整链路

必须逐项验证：

1. 点击“使用 GitHub 登录”；
2. GitHub 授权页不再出现 Invalid Redirect URI；
3. 回调回到 `/StarHub/`；
4. state 校验通过；
5. Cloudflare 成功交换 token；
6. StarHub 读取当前 GitHub 用户；
7. StarHub 获取 Star 列表；
8. 刷新页面后登录状态行为符合预期；
9. 撤销 GitHub 授权后能够正确清理本地状态。

只有上述流程通过，才能把 OAuth 后端标记为生产完成。

## 11. 主要文件

- `functions/api/health.ts`
- `functions/api/oauth/token.ts`
- `functions/tsconfig.json`
- `functions/types.d.ts`
- `scripts/build-cloudflare.mjs`
- `.dev.vars.example`
- `src/utils/oauth.ts`
- `src/config/oauth.ts`
- `src/api/auth.ts`
- `src/api/backend.ts`
- `src/api/request.ts`
- `src/pages/Login.vue`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-pages.yml`
- `docs/deploy/cloudflare.md`
- `docs/guide/oauth.md`

## 12. 未完成与风险

### 平台部署

- Cloudflare Pages 项目尚未创建；
- Production Secret 尚未添加；
- GitHub Actions API 地址变量尚未添加；
- 真实 OAuth 尚未验证。

### Token 存储

GitHub token 当前仍保存在 localStorage。此次批次消除了伪 appToken，并加强了授权过程，但 token 生命周期和浏览器存储策略仍需单独评估。

### 依赖与质量

- `npm audit`：33 个漏洞，其中 19 个 high；
- ESLint：8 条既有非阻断警告；
- 两个主要 chunk 超过 1 MB；
- VitePress 仍有高亮回退与 CSS nesting 警告；
- 单元测试与 E2E 测试尚未建立。

### 仓库同步

- 取消 Star 后旧仓库仍可能残留；
- 同步尚未区分完整成功、部分成功和失败；
- 尚未做到完整分页成功后原子替换；
- 尚未增加同步单元测试。

## 13. 下一步执行顺序

1. 用户创建 Cloudflare Pages 项目；
2. 用户添加 Production Variables and Secrets；
3. 用户更新 GitHub OAuth App callback；
4. 获取 `pages.dev` 地址并设置 GitHub Actions Variables；
5. 重新部署 GitHub Pages；
6. 验证健康检查与完整 OAuth 链路；
7. 更新项目状态为生产完成；
8. 进入幽灵仓库与同步正确性修复。

后续不得把“代码构建通过”误报为“Cloudflare 已部署”或“OAuth 已生产可用”。
