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

- 统一 Node.js 22；
- 建立 Vue、TypeScript、Node.js、Cloudflare Functions ESLint 基线；
- 建立非破坏性 Lint、类型检查、构建和 CI；
- 修复本地 OAuth 服务入口；
- 配置 Vite `/StarHub/` 和 VitePress `/StarHub/docs/`；
- 统一构建应用与文档到 `dist/`；
- 生成 `.nojekyll` 与带构建 SHA 的 `deployment-info.json`；
- 建立 Pages 构建、上传、部署和公网冒烟测试；
- 启用 GitHub Pages，确认 `build_type: workflow`；
- 诊断并修复开发分支无法进入 `github-pages` 生产环境的问题；
- 最终生产策略改为 PR 构建验证、`main` 推送生产发布；
- 删除临时诊断工作流。

## 3. 目标地址

```text
应用：https://hujinghaoabcd.github.io/StarHub/
文档：https://hujinghaoabcd.github.io/StarHub/docs/
```

## 4. 部署诊断结论

开发分支诊断运行：

```text
Build Pages bundle           PASS
Configure GitHub Pages       PASS
Upload GitHub Pages artifact PASS
Deploy Pages site            FAIL（未分配 runner）
```

Pages API：

```text
build_type: workflow
html_url: https://hujinghaoabcd.github.io/StarHub/
source.branch: main
```

因此生产 Pages 只允许从 `main` 发布。此前 `/StarHub/deployment-info.json` 连续 6 分钟返回 404，是因为开发分支未产生部署，而不是应用构建或资源路径失败。

## 5. 最终工作流

Pull Request：安装依赖、构建应用与文档、读取 Pages 配置，不发布生产站点。

`main` 推送：构建联合产物、配置 Pages、上传 artifact、发布、验证页面、提交 SHA、资源路径和实际资源，再尝试回写关联 PR。

## 6. 当前验证结果

```text
npm ci                    PASS
npm run lint              PASS，9 条非阻断警告
npm run type-check        PASS
npm run pages:build       PASS
Pages 配置读取            PASS
Pages artifact 上传       PASS（诊断运行）
```

待 `main` 验证：

```text
Deploy Pages site         PENDING
Verify deployed site      PENDING
应用与文档公网地址        PENDING
```

## 7. 修改文件

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

## 8. 未完成与风险

- 同步仍可能保留取消 Star 的旧仓库，下一批优先修复；
- OAuth 后端尚未部署，登录暂不属于生产可用；
- OAuth 缺少 `state`，回调、token 交换和本地存储仍需重构；
- 依赖审计有 33 个漏洞，其中 19 个 high；
- 存在 9 条 ESLint 警告、大 chunk 和 VitePress 警告；
- 单元和 E2E 测试尚未建立。

## 9. 下一步

1. 等待 PR #3 最终 CI；
2. 标记 Ready 并合并到 `main`；
3. 验证生产部署与公网冒烟测试；
4. 更新最终在线状态；
5. 修复同步幽灵仓库并增加测试；
6. 进入 OAuth 安全和 Worker 后端。

## 10. 本地复现

```bash
nvm use
npm ci
npm run check
npm run pages:build
```

后续每批必须更新已完成、未完成、验证、风险和交接文档，不得把构建成功误报为线上成功。
