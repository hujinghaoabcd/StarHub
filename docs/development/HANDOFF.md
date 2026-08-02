# StarHub 开发交接文档

## 1. 交接信息

- 交接日期：2026-08-02
- 当前分支：`agent/foundation-ci-sync`
- 基准分支：`main`
- PR：`#3 chore: establish CI and GitHub Pages deployment foundation`
- 当前阶段：工程基础、CI 基线和 Pages 生产流程已完成
- 当前动作：完成 PR 验证后合并到 `main`，触发首次正式部署
- 状态文档：`docs/development/PROJECT_STATUS.md`

## 2. 本阶段已完成

### 工程基础

- Node.js 22 `.nvmrc`；
- Vue、TypeScript、Node.js、Cloudflare Functions ESLint 基线；
- 非破坏性 `lint`、`lint:fix`、`type-check`、`check`；
- 修复本地 OAuth 服务入口；
- GitHub Actions CI；
- 持续维护的状态和交接文档。

### Pages 联合构建

目标地址：

```text
应用：https://hujinghaoabcd.github.io/StarHub/
文档：https://hujinghaoabcd.github.io/StarHub/docs/
```

统一命令：

```bash
npm run pages:build
```

联合产物：

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

`deployment-info.json` 包含：

```json
{
  "appBase": "/StarHub/",
  "docsBase": "/StarHub/docs/",
  "commit": "<GITHUB_SHA>"
}
```

### Pages 工作流

文件：

```text
.github/workflows/deploy-pages.yml
```

当前标准流程：

- Pull Request：构建应用和文档、读取 Pages 配置，不执行生产发布；
- `main` 推送：构建、配置 Pages、上传 artifact、部署、执行公网冒烟测试；
- 手动运行：只有选择 `main` 时才允许生产部署；
- 生产结果会尝试回写到关联 PR。

公网冒烟测试会验证：

1. 应用首页返回成功；
2. 文档首页返回成功；
3. `deployment-info.json` 存在；
4. 线上提交 SHA 与当前 `main` 提交一致；
5. 应用资源使用 `/StarHub/assets/`；
6. 文档资源使用 `/StarHub/docs/assets/`；
7. 分别请求一个应用和文档 JS/CSS 资源。

## 3. 本轮诊断结论

Pages 已成功启用，API 返回：

```text
build_type: workflow
html_url: https://hujinghaoabcd.github.io/StarHub/
source.branch: main
```

开发分支生产尝试的结果：

```text
Build Pages bundle           PASS
Configure GitHub Pages       PASS
Upload GitHub Pages artifact PASS
Deploy Pages site            FAIL（未分配 runner，无执行步骤）
```

公网轮询在 6 分钟内持续得到：

```text
/StarHub/deployment-info.json → HTTP 404
```

结合 Pages 配置中的 `source.branch: main`，结论是 `github-pages` 环境不允许开发分支执行生产部署。该行为不是构建错误，也不是资源路径错误。

处理结果：

- 删除开发分支生产发布触发；
- 生产部署只允许 `main`；
- PR 保留联合构建和 Pages 配置检查；
- 删除临时诊断工作流；
- 修复结果回写所需的 `pull-requests: read` 权限；
- 合并后通过 commit-associated PR API 回写部署结果。

## 4. 当前验证结果

已通过：

```text
npm ci                    PASS
npm run lint              PASS，9 条非阻断警告
npm run type-check        PASS
npm run pages:build       PASS
Pages 配置读取            PASS
Pages artifact 上传       PASS（开发分支诊断运行）
```

待合并后验证：

```text
Deploy Pages site         PENDING ON MAIN
Verify deployed site      PENDING ON MAIN
应用与文档公网地址        PENDING ON MAIN
```

## 5. 本阶段主要修改文件

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

临时的 `.github/workflows/pages-diagnostics.yml` 已用于定位 push 运行并删除，不属于最终方案。

## 6. 已知风险与未完成项

### 在线功能

- Pages 上线后主要提供界面与文档预览；
- GitHub OAuth 后端尚未部署；
- `/api/getToken` 在线环境暂不可用；
- GitHub 登录不能视为生产可用。

### OAuth 安全

- 缺少 `state`；
- 回调仍使用 `window.opener` 全局函数；
- token 交换仍是 GET 风格；
- GitHub token 仍存入 localStorage；
- 随机 `appToken` 无实际认证作用。

### 仓库同步

- 当前同步仍会保留已经取消 Star 的旧仓库；
- 尚未区分完整成功、部分成功和失败；
- 下一批必须优先处理。

### 依赖与质量

- `npm audit`：33 个漏洞，其中 19 个 high；
- ESLint：9 条非阻断警告；
- Element Plus 与 libs chunk 超过 1 MB；
- VitePress 存在 `env` 高亮回退和 CSS nesting 警告；
- 单元测试和 E2E 测试尚未建立。

## 7. 下一步执行顺序

1. 等待 PR #3 最后一轮 CI；
2. 将 PR 标记为 Ready；
3. 合并到 `main`；
4. 检查 `main` 的 Pages 构建、部署和公网冒烟测试；
5. 确认应用与文档在线地址；
6. 更新最终部署状态；
7. 建立同步合并函数与测试；
8. 修复取消 Star 后仍残留的幽灵仓库；
9. 开始 OAuth 安全重构；
10. 部署 Cloudflare Worker 后端。

## 8. 本地复现命令

```bash
nvm use
npm ci
npm run check
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

## 9. 交接要求

后续每一批工作完成前必须：

- 更新 `PROJECT_STATUS.md` 的已完成与未完成；
- 更新本交接文档的修改、验证、风险和下一步；
- 不把“构建成功”误报为“线上成功”；
- 不绕过 CI 或关闭真实质量检查；
- 生产 Pages 只从 `main` 发布。
