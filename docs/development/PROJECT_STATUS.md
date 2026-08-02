# StarHub 项目更新状态

> 本文档记录每一批开发工作的已完成项、未完成项、验证状态和下一步。每次提交或交接都应同步更新。

## 当前概况

- 当前阶段：第一阶段——稳定性与部署基础
- 工作分支：`agent/foundation-ci-sync`
- 基准分支：`main`
- PR：`#3 chore: establish CI and GitHub Pages deployment foundation`
- 最近更新：2026-08-02
- 当前目标：完成 PR 验证并合并到 `main`，触发首次正式 Pages 部署

## 已完成

### 批次 1：工程基础与 CI 基线

- [x] 创建独立开发分支和草稿 PR #3
- [x] 统一 Node.js 22
- [x] 建立 Vue、TypeScript、Node.js、Cloudflare Functions 的 ESLint 配置
- [x] 将 `lint` 改为非破坏性检查并新增 `lint:fix`
- [x] 新增 `type-check`、`check` 和 `server:dev`
- [x] 修复本地 OAuth 服务错误入口
- [x] 新增 GitHub Actions CI
- [x] Lint、类型检查和生产构建通过
- [x] 建立持续更新的状态文档和交接文档

### 批次 2：应用预览与文档同域部署

- [x] Vite 应用支持可配置 `base`，目标 `/StarHub/`
- [x] VitePress 文档支持可配置 `base`，目标 `/StarHub/docs/`
- [x] 修复生产环境文档链接和 OAuth 回调路径前缀
- [x] 新增 `scripts/build-pages.mjs` 与 `npm run pages:build`
- [x] 将文档合并到 `dist/docs/`
- [x] 生成 `.nojekyll` 与 `deployment-info.json`
- [x] `deployment-info.json` 记录实际构建提交 SHA
- [x] CI 验证完整 Pages 组合产物
- [x] 新增 GitHub Pages 构建、上传、部署与公网冒烟测试
- [x] Pages 已在仓库设置中启用，`build_type` 为 `workflow`
- [x] Pages API 返回正式地址 `https://hujinghaoabcd.github.io/StarHub/`
- [x] 诊断开发分支生产发布失败：构建和 artifact 上传成功，`Deploy Pages site` 在分配 runner 前失败
- [x] 将生产发布调整为标准模式：PR 只构建，只有 `main` 推送才部署
- [x] 公网冒烟测试检查应用、文档、部署元数据、提交 SHA 和实际 JS/CSS 资源
- [x] 修复部署结果回写权限，增加 `pull-requests: read`
- [x] 删除临时 Pages 诊断工作流

## 未完成

### 当前发布验证

- [ ] 完成 PR #3 最后一轮 CI
- [ ] 将 PR #3 合并到 `main`
- [ ] 确认 `main` 的 `Deploy GitHub Pages` 成功
- [ ] 确认公网冒烟测试通过
- [ ] 验证应用地址 `https://hujinghaoabcd.github.io/StarHub/`
- [ ] 验证文档地址 `https://hujinghaoabcd.github.io/StarHub/docs/`

### P0：必须优先处理

- [ ] 修复同步后仍保留已取消 Star 仓库的问题
- [ ] 同步失败时区分完整成功、部分成功和失败
- [ ] OAuth 登录增加 `state` 生成、保存与回调校验
- [ ] OAuth 弹窗回调改为 `postMessage` 并校验来源
- [ ] token 交换改用 POST 请求体
- [ ] 移除无实际认证作用的随机 `appToken`
- [ ] 设计 GitHub Token 的安全存储方案

### P1：数据与结构重构

- [ ] 统一 `tags.repos` 与 `repoTags` 双轨标签模型
- [ ] 批量标签操作改为单次 Dexie transaction
- [ ] 排序顺序改为“筛选 → 全局排序 → 分页”
- [ ] 拆分 `SideMenu.vue` 中的 AI 调度、README 抓取和写库逻辑
- [ ] AI 与 README 请求接入取消与结构化校验

### P1：部署与后端

- [x] 建立应用和文档统一 Pages 部署产物
- [x] 启用 GitHub Pages，Source 为 GitHub Actions
- [x] 限制生产部署只从 `main` 执行
- [x] 增加发布后公网冒烟测试
- [ ] 配置生产 API 地址环境变量
- [ ] 部署 Cloudflare Worker OAuth 后端
- [ ] 配置生产 OAuth App 首页和回调地址
- [ ] 在在线环境完成 GitHub 登录测试

### P1：依赖安全

- [ ] 审查 33 个依赖漏洞：2 low、12 moderate、19 high
- [ ] 升级 ESLint 8 及相关配置依赖
- [ ] 分批升级 Vue、Vite、Element Plus、Dexie、Axios 等依赖
- [ ] 禁止未经审查地运行 `npm audit fix --force`

### P2：质量与产品功能

- [ ] 清理 9 条非阻断 ESLint 警告
- [ ] 处理 Element Plus 与 libs 超过 1 MB 的 chunk 警告
- [ ] 处理 VitePress `env` 语法高亮和 CSS nesting 警告
- [ ] 增加 Vitest、Vue Test Utils 和 Playwright 测试
- [ ] 完善移动端、国际化和数据导入导出
- [ ] 决定实现真实 PWA 或删除当前 PWA 宣传

## 当前验证状态

- GitHub Actions CI：通过既有基线
  - `npm ci`：成功
  - `npm run lint`：成功，9 条非阻断警告
  - `npm run type-check`：成功
  - `npm run pages:build`：成功
- Pages 组合产物：通过
  - 应用：`dist/` → `/StarHub/`
  - 文档：`dist/docs/` → `/StarHub/docs/`
- Pages 配置：已启用，`build_type: workflow`
- 开发分支生产尝试：构建与上传成功，部署环境拒绝分支发布
- 正式生产策略：只允许 `main` 部署
- 在线地址：尚未发布当前 PR 内容
- OAuth 真实登录：未完成，生产后端尚未部署

## 下一步

1. 等待本次 PR CI 完成；
2. 将 PR #3 转为 Ready 并合并到 `main`；
3. 检查 `main` 的构建、部署和公网冒烟测试；
4. 更新最终 Pages 上线状态；
5. 开始仓库同步幽灵数据修复与测试；
6. 再进入 OAuth 安全重构和 Cloudflare Worker 部署。

## 更新规则

每一批工作必须记录：已完成、未完成、修改文件、验证结果、已知风险和下一步。
