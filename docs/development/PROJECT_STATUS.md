# StarHub 项目更新状态

> 本文档记录每一批开发工作的已完成项、未完成项、验证状态和下一步。每次提交或交接都应同步更新。

## 当前概况

- 当前阶段：第一阶段——稳定性与部署基础
- 工作分支：`agent/foundation-ci-sync`
- 基准分支：`main`
- 草稿 PR：`#3 chore: establish CI baseline and development handoff`
- 最近更新：2026-08-02
- 当前目标：完成 GitHub Pages 首次启用，随后进入仓库同步正确性与 OAuth 安全重构

## 已完成

### 批次 1：工程基础与 CI 基线

- [x] 创建独立开发分支 `agent/foundation-ci-sync`，未直接修改 `main`
- [x] 创建草稿 PR #3，所有后续修改继续追加到该分支
- [x] 将根目录 `lint` 改为非破坏性检查，避免 CI 自动修改源文件
- [x] 新增 `lint:fix`，保留本地自动修复能力
- [x] 新增统一质量命令 `npm run check`
- [x] 新增根目录命令 `npm run server:dev`
- [x] 修复 `server/package.json` 指向不存在的 `oauth-server.js` 的问题
- [x] 将本地 OAuth 服务入口统一为 `server/dev-server.js`
- [x] 新增 `.nvmrc`，统一使用 Node.js 22
- [x] 新增 `.eslintrc.cjs`，正确解析 Vue、TypeScript、Cloudflare Functions 与 Node.js 文件
- [x] 使用 Vue Essential 规则建立存量代码质量基线，避免历史模板排版警告阻断构建
- [x] 将未使用局部变量交由 ESLint 报告，`vue-tsc` 保持严格类型检查但不重复阻断
- [x] 新增 GitHub Actions CI：安装依赖、Lint、类型检查、生产构建
- [x] GitHub Actions 首次完整验证通过：Lint、TypeScript 类型检查、生产构建均成功
- [x] 新增项目状态文档和交接文档

### 批次 2：应用预览与文档同域部署

- [x] 为 Vite 应用增加可配置 `base`，GitHub Pages 目标路径为 `/StarHub/`
- [x] 为 VitePress 增加可配置 `base`，文档目标路径为 `/StarHub/docs/`
- [x] 修复生产环境文档链接，使登录页“文档”指向同域 `/StarHub/docs/`
- [x] 修复 GitHub OAuth 回调路径，使项目站点回调保留 `/StarHub/` 前缀
- [x] 保留 Vite 对 `public` 静态资源的原生路径处理，避免将 `/logo.svg` 错误编译为模块导入
- [x] 新增 `scripts/build-pages.mjs`，统一构建应用与文档
- [x] 将 VitePress 产物合并到 `dist/docs/`
- [x] 生成 `.nojekyll` 与 `deployment-info.json`
- [x] 新增 `npm run pages:build`
- [x] CI 改为验证完整 Pages 组合产物，而不仅是应用产物
- [x] 新增 `.github/workflows/deploy-pages.yml`
- [x] Pages 工作流具备构建、配置、上传和发布四个阶段
- [x] PR 事件只验证组合产物，不执行生产发布
- [x] 分支推送和 PR 验证使用不同并发组，避免互相取消
- [x] GitHub Actions 已验证应用与文档联合构建成功
- [x] Pages 配置探测已执行：`GET /repos/hujinghaoabcd/StarHub/pages` 返回 HTTP 404
- [x] 确认当前仓库尚未创建 GitHub Pages 站点

## 未完成

### 当前人工阻塞：GitHub Pages 首次启用

- [ ] 在仓库 `Settings → Pages` 中将 `Build and deployment → Source` 设置为 `GitHub Actions`
- [ ] 首次启用后重新运行 `Deploy GitHub Pages` 工作流
- [ ] 验证应用地址 `https://hujinghaoabcd.github.io/StarHub/`
- [ ] 验证文档地址 `https://hujinghaoabcd.github.io/StarHub/docs/`
- [ ] 完成浏览器级静态资源、路由和文档导航检查

说明：创建 Pages 站点要求 Pages 写入和 Administration 写入权限。Actions 的 `GITHUB_TOKEN` 只有 Pages 权限，不能代替仓库管理员完成首次启用。首次启用完成后，后续提交可自动发布。

### P0：必须优先处理

- [ ] OAuth 登录增加 `state` 生成、保存与回调校验
- [ ] OAuth 弹窗回调从全局函数改为 `postMessage`，并校验来源域名
- [ ] token 交换改用 POST 请求体，禁止在 URL 中携带 `code` 和 `client_secret`
- [ ] 移除无实际认证作用的随机 `appToken`
- [ ] 设计 GitHub Token 的安全存储方案
- [ ] 修复同步后仍保留已取消 Star 仓库的问题
- [ ] 同步失败时区分完整成功、部分成功和失败

### P1：数据与结构重构

- [ ] 统一标签关系模型，消除 `tags.repos` 与 `repoTags` 双轨存储
- [ ] 批量标签操作改为单次 Dexie transaction
- [ ] 排序顺序改为“筛选 → 全局排序 → 分页”
- [ ] 拆分 `SideMenu.vue` 中的 AI 调度、README 抓取和写库逻辑
- [ ] 删除 `SideMenu.vue` 中未使用的 `batchCategoryMap` 返回值
- [ ] AI 与 README 请求接入 `AbortController`
- [ ] AI 返回结果增加结构化校验

### P1：部署与后端

- [x] 增加 GitHub Pages 构建和部署工作流
- [x] 配置 Vite 的 GitHub Pages `base`
- [x] 配置 VitePress 文档子路径
- [x] 建立应用和文档统一部署产物
- [ ] 配置生产 API 地址环境变量
- [ ] 部署 Cloudflare Worker OAuth 后端
- [ ] 配置生产 OAuth App 首页和回调地址
- [ ] 在在线环境完成 GitHub 登录测试

### P1：依赖安全

- [ ] 审查 `npm audit` 报告中的 33 个漏洞：2 low、12 moderate、19 high
- [ ] 升级已停止维护的 ESLint 8 及相关配置依赖
- [ ] 分批升级 Vue、Vite、Element Plus、Dexie、Axios 等依赖并执行回归测试
- [ ] 禁止直接执行未经审查的 `npm audit fix --force`

### P2：质量与产品功能

- [ ] 清理当前 9 条非阻断 ESLint 警告
- [ ] 处理应用构建中 Element Plus 与 libs 超过 1 MB 的 chunk 警告
- [ ] 处理 VitePress 文档中的 `env` 语法高亮回退提示
- [ ] 处理 VitePress CSS nesting 兼容性警告
- [ ] 增加 Vitest 单元测试
- [ ] 增加 Vue Test Utils 组件测试
- [ ] 增加 Playwright E2E 测试
- [ ] 完善移动端布局
- [ ] 完成全量国际化
- [ ] 决定并实现真实 PWA，或删除当前 PWA 宣传
- [ ] README 请求缓存与竞态控制
- [ ] 用户数据导入、导出和迁移

## 当前验证状态

- 静态代码审查：已完成第一轮
- GitHub Actions CI：通过
  - `npm ci`：成功
  - `npm run lint`：成功，9 条非阻断警告
  - `npm run type-check`：成功
  - `npm run pages:build`：成功
- Pages 组合产物：通过
  - 应用：`dist/`，目标 `/StarHub/`
  - 文档：`dist/docs/`，目标 `/StarHub/docs/`
- GitHub Pages 配置：尚未启用，API 返回 HTTP 404
- 在线地址：尚不可访问
- 依赖审计：发现 33 个漏洞，尚未升级
- 本地安装与构建：当前执行环境无法通过本地网络解析 `github.com`，未在本地执行
- 浏览器手工测试：等待 Pages 首次启用
- OAuth 真实登录测试：未完成，生产后端尚未部署

## 下一步

1. 仓库管理员首次启用 GitHub Pages，Source 选择 `GitHub Actions`；
2. 重新运行 Pages 工作流并验证应用与文档地址；
3. 合并或继续维护 PR #3；
4. 提取仓库同步合并逻辑并增加测试；
5. 修复取消 Star 后仍保留的幽灵仓库；
6. 开始 OAuth 安全重构和 Cloudflare Worker 部署。

## 更新规则

每一批工作必须至少记录：

1. 已完成内容；
2. 未完成内容；
3. 修改文件；
4. 验证结果；
5. 已知风险；
6. 下一位开发者可以直接执行的下一步。
