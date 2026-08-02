# StarHub 开发交接文档

## 1. 当前状态

- GitHub Pages 已成功发布；
- 生产发布仅允许从 `main` 执行；
- 应用与文档由 GitHub Actions 自动构建、发布和验证；
- Pages 当前主要提供界面与文档预览；
- GitHub OAuth 生产后端尚未部署，在线登录暂不属于生产可用。

## 2. 在线地址

```text
应用：https://hujinghaoabcd.github.io/StarHub/
文档：https://hujinghaoabcd.github.io/StarHub/docs/
```

## 3. 已完成

### 工程与 CI

- Node.js 22；
- Vue、TypeScript、Node.js、Cloudflare Functions ESLint 基线；
- 非破坏性 Lint、类型检查和统一质量命令；
- GitHub Actions CI；
- 本地 OAuth 服务入口修复。

### Pages 构建与发布

- 应用构建到 `/StarHub/`；
- 文档构建到 `/StarHub/docs/`；
- 应用与文档合并到同一 `dist/`；
- 生成 `.nojekyll`；
- 生成带构建提交 SHA 的 `deployment-info.json`；
- Pull Request 只执行构建验证；
- `main` 推送执行 Pages 配置、artifact 上传、部署和公网冒烟测试；
- 应用、文档、部署元数据和实际静态资源均通过公网验证；
- 临时诊断工作流未进入最终 `main`。

## 4. 首次完整生产验证

```text
main CI run                   30747981390  PASS
main Pages deployment run     30747981393  PASS
application page              PASS
VitePress documentation       PASS
deployment-info.json          PASS
verified application commit   b406ede95eb3666bcf33d4b82bca576e112469f5
application asset             /StarHub/assets/index-D_FEoJXh.js
VitePress asset               /StarHub/docs/assets/style.9lQW86My.css
```

验证内容包括：

1. 应用首页包含 Vue 挂载点；
2. 应用资源使用 `/StarHub/assets/`；
3. 文档首页可访问；
4. 文档资源使用 `/StarHub/docs/assets/`；
5. `deployment-info.json` 中的基础路径正确；
6. 在线提交 SHA 与对应 `main` 构建提交一致；
7. 应用 JS 与文档 CSS 代表性资源均能成功请求。

最新在线提交应以站点的 `deployment-info.json` 为准。永久部署工作流会在每次 `main` 发布后自动验证在线 SHA 与当前构建一致。

## 5. 部署过程中发现并解决的问题

### Pages 首次未启用

仓库已在 `Settings → Pages` 中将 Source 设置为 `GitHub Actions`。

### 开发分支不能生产部署

开发分支能够完成构建、Pages 配置和 artifact 上传，但 `github-pages` environment 不接受该分支的生产部署。最终采用标准流程：

- Pull Request：构建与配置验证；
- `main`：正式发布。

### 静态资源路径

曾错误预处理模板中的 `/logo.svg`，导致 Rollup 将 `/StarHub/logo.svg` 视为源码模块。最终保留 Vite 对 `public` 静态资源的原生处理，只通过 `base` 配置项目路径。

### 部署结果可追溯性

`deployment-info.json` 记录构建提交 SHA，公网冒烟测试要求线上 SHA 与当前构建 SHA 完全匹配，避免将旧版本误判为部署成功。

## 6. 主要最终文件

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

## 7. 未完成与风险

### 仓库同步

- 取消 Star 后旧仓库仍可能残留；
- 同步尚未区分完整成功、部分成功和失败；
- 写库过程尚未做到完整分页成功后的原子替换；
- 尚未建立同步单元测试；
- 下一批优先处理。

### OAuth 与后端

- Cloudflare Worker 尚未部署；
- OAuth 缺少 `state`；
- 回调仍使用 `window.opener` 全局函数；
- token 交换仍为 GET 风格；
- GitHub token 仍存入 localStorage；
- 随机 `appToken` 无实际认证作用。

### 依赖与质量

- `npm audit`：33 个漏洞，其中 19 个 high；
- ESLint：9 条非阻断警告；
- Element Plus 与 libs chunk 超过 1 MB；
- VitePress 存在 `env` 高亮回退和 CSS nesting 警告；
- 单元测试与 E2E 测试尚未建立。

## 8. 下一步执行顺序

1. 提取仓库同步结果合并纯函数；
2. 增加同步单元测试；
3. 修复取消 Star 后仍残留的幽灵仓库；
4. 区分完整成功、部分成功和失败；
5. 确保完整分页成功后再原子更新 IndexedDB；
6. 再进入 OAuth 安全重构；
7. 部署 Cloudflare Worker 后端。

## 9. 本地复现

```bash
nvm use
npm ci
npm run check
npm run pages:build
```

后续每批必须更新已完成、未完成、验证、风险和交接文档，不得把构建成功误报为线上成功。
