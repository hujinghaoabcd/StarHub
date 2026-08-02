# StarHub 项目更新状态

## 当前概况

- 基准分支：`main`
- 当前阶段：OAuth 安全代码与 Cloudflare Pages Functions 部署准备
- GitHub Pages：已启用并成功发布
- 前端生产发布：仅 `main`
- OAuth 后端代码：已完成并通过 CI
- Cloudflare 平台项目：尚未创建
- 真实 GitHub 登录：尚未完成生产验证

## 已完成

### 批次 1：工程与 CI 基线

- [x] Node.js 22、ESLint、类型检查和 CI 基线
- [x] 非破坏性 Lint、`lint:fix`、`check` 与 `server:dev`
- [x] GitHub Actions CI
- [x] 应用与文档联合构建

### 批次 2：GitHub Pages 同域部署

- [x] 应用基础路径 `/StarHub/`
- [x] 文档基础路径 `/StarHub/docs/`
- [x] 生成 `.nojekyll`
- [x] 生成带构建 SHA 的 `deployment-info.json`
- [x] Pages 构建、artifact 上传、生产发布和公网冒烟测试
- [x] 应用首页、文档首页、部署 SHA 和代表性静态资源验证

### 批次 3：OAuth 安全代码

- [x] OAuth 回调改为应用根路径，不再依赖 URL fragment
- [x] 生产回调固定为 `https://hujinghaoabcd.github.io/StarHub/`
- [x] 增加加密随机 `state` 并在回调时校验
- [x] 增加 PKCE S256
- [x] 弹窗回调改为 `postMessage`
- [x] 校验消息来源域名、来源窗口和消息类型
- [x] code 通过 JSON POST 发送给后端
- [x] GitHub token 交换使用表单 POST 请求体
- [x] 增加严格 Origin 白名单与 CORS 预检
- [x] 增加 redirect URI 精确校验
- [x] 增加 `Cache-Control: no-store` 与 `nosniff`
- [x] 删除无实际认证意义的随机 `appToken`
- [x] 401 跳转保留 GitHub Pages `/StarHub/` 基础路径

### 批次 4：Cloudflare Pages Functions 工程化

- [x] 新增 `POST /api/oauth/token`
- [x] 新增 `OPTIONS /api/oauth/token`
- [x] 新增 `GET /api/health`
- [x] 新增 Functions 独立 TypeScript 配置
- [x] 新增 `npm run cloudflare:type-check`
- [x] 新增 `npm run cloudflare:build`
- [x] 新增最小 `cloudflare-dist` 输出与 `_routes.json`
- [x] CI 同时验证前端、文档和 Functions
- [x] Pages 构建读取 `VITE_API_BASE_URL` 与 `VITE_GITHUB_CLIENT_ID`
- [x] 增加 `.dev.vars.example`
- [x] 增加 Cloudflare 部署与 OAuth 配置文档

## 当前验证

```text
CI run                         30750815713  PASS
Pages PR build run             30750815708  PASS
npm ci                                      PASS
npm run lint                               PASS，8 条既有非阻断警告
npm run type-check                         PASS
npm run cloudflare:type-check              PASS
npm run pages:build                         PASS
npm run cloudflare:build                    PASS
Pages 配置读取                              PASS
```

当前验证只证明代码与构建产物正确，不代表 Cloudflare 服务已经上线，也不代表真实 OAuth 登录已经成功。

## 在线地址

- 应用：`https://hujinghaoabcd.github.io/StarHub/`
- 文档：`https://hujinghaoabcd.github.io/StarHub/docs/`

## 等待用户完成的生产配置

- [ ] 在 Cloudflare Pages 连接 `hujinghaoabcd/StarHub`
- [ ] Build command 设置为 `npm run cloudflare:build`
- [ ] Build output directory 设置为 `cloudflare-dist`
- [ ] 添加 `CLIENT_ID`
- [ ] 添加加密 Secret `CLIENT_SECRET`
- [ ] 添加 `ALLOWED_ORIGINS=https://hujinghaoabcd.github.io`
- [ ] 添加 `GITHUB_REDIRECT_URI=https://hujinghaoabcd.github.io/StarHub/`
- [ ] 将 GitHub OAuth App Homepage 与 callback 更新为生产地址
- [ ] 将 Cloudflare API 地址写入 GitHub Actions 变量 `VITE_API_BASE_URL`
- [ ] 重新发布 GitHub Pages
- [ ] 验证 `/api/health` 返回 `configured: true`
- [ ] 完成真实授权、用户信息读取和 Star 列表同步

## 后续未完成

### P0：仓库同步正确性

- [ ] 修复取消 Star 后本地仍保留旧仓库的问题
- [ ] 提取可测试的同步结果合并函数
- [ ] 区分完整成功、部分成功和失败
- [ ] 远程分页全部成功后再原子更新 IndexedDB
- [ ] 增加同步单元测试

### P1：令牌存储与数据模型

- [ ] 评估比 localStorage 更安全的 GitHub token 生命周期方案
- [ ] 统一 `tags.repos` 与 `repoTags` 双轨标签模型

### P1：依赖与质量

- [ ] 审查 33 个依赖漏洞：2 low、12 moderate、19 high
- [ ] 清理 8 条 ESLint 警告
- [ ] 处理两个超过 1 MB 的主要 chunk
- [ ] 处理 VitePress 高亮和 CSS nesting 警告
- [ ] 增加 Vitest、Vue Test Utils 和 Playwright

## 下一步

1. 完成 Cloudflare Pages 平台配置；
2. 验证健康检查和完整 OAuth 登录；
3. 在生产验证成功后更新本文件；
4. 随后进入仓库同步正确性批次。

## 更新规则

每一批必须记录：已完成、未完成、修改文件、验证结果、已知风险和下一步。构建成功不得表述为线上部署成功。
