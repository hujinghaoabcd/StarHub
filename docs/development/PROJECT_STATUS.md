# StarHub 项目更新状态

> 本文档记录每一批开发工作的已完成项、未完成项、验证状态和下一步。每次提交或交接都应同步更新。

## 当前概况

- 当前阶段：第一阶段——稳定性与部署基础
- 工作分支：`agent/foundation-ci-sync`
- 基准分支：`main`
- 最近更新：2026-08-02
- 当前目标：建立可持续开发流程，先获得真实 CI 基线，再逐步修复认证、同步和数据模型问题

## 已完成

### 批次 1：工程基础与 CI 基线

- [x] 创建独立开发分支 `agent/foundation-ci-sync`，未直接修改 `main`
- [x] 将根目录 `lint` 改为非破坏性检查，避免 CI 自动修改源文件
- [x] 新增 `lint:fix`，保留本地自动修复能力
- [x] 新增统一质量命令 `npm run check`
- [x] 新增根目录命令 `npm run server:dev`
- [x] 修复 `server/package.json` 指向不存在的 `oauth-server.js` 的问题
- [x] 将本地 OAuth 服务入口统一为 `server/dev-server.js`
- [x] 新增 `.nvmrc`，统一使用 Node.js 22
- [x] 新增 GitHub Actions CI：安装依赖、Lint、类型检查、生产构建
- [x] 新增项目状态文档和交接文档

## 未完成

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
- [ ] AI 与 README 请求接入 `AbortController`
- [ ] AI 返回结果增加结构化校验

### P1：部署

- [ ] 增加 GitHub Pages 构建和部署工作流
- [ ] 配置 Vite 的 GitHub Pages `base`
- [ ] 修复静态资源绝对路径
- [ ] 配置生产 API 地址环境变量
- [ ] 部署 Cloudflare Worker OAuth 后端
- [ ] 配置生产 OAuth App 回调地址

### P2：质量与产品功能

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
- 本地安装与构建：当前执行环境未安装 GitHub CLI，且之前无法通过本地网络克隆仓库，尚未完成
- GitHub Actions：已新增工作流，等待分支推送触发后的结果
- 浏览器手工测试：未完成
- OAuth 真实登录测试：未完成

## 更新规则

每一批工作必须至少记录：

1. 已完成内容；
2. 未完成内容；
3. 修改文件；
4. 验证结果；
5. 已知风险；
6. 下一位开发者可以直接执行的下一步。
