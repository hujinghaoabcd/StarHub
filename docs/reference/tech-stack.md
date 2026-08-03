# 技术栈与工程约束

## 运行时

| 领域 | 技术 | 作用 |
|---|---|---|
| UI | Vue 3、TypeScript、Element Plus | 组合式 API、类型安全与组件库 |
| 状态 | Pinia | 仓库、分类、任务、重点标记与用户状态 |
| 路由 | Vue Router hash history | 适配 GitHub Pages 子路径静态部署 |
| 本地数据库 | Dexie / IndexedDB | 存储仓库、关系、任务、缓存和迁移快照 |
| 国际化 | vue-i18n | 中文、英文与英文 fallback |
| HTTP | Axios | GitHub、OAuth API 与 AI 供应商请求 |
| Markdown | Marked、DOMPurify、highlight.js | README 解析、净化和代码高亮 |
| 长列表 | vue-virtual-scroller | 大量仓库渲染优化 |
| 构建 | Vite | 应用开发与静态构建 |
| 文档 | VitePress | `/docs/` 文档站与本地搜索 |
| OAuth API | Cloudflare Pages Functions | 保护 GitHub Client Secret 与 token 交换 |

依赖的准确版本以 `package.json` 与 `package-lock.json` 为准，文档不复制易过期的完整版本表。Node.js 最低版本为 22.12.0。

## 安全选择

- vue-i18n 开启 JIT，满足不允许 `unsafe-eval` 的 CSP；
- README 在 worker 中解析并经 DOMPurify 净化；
- OAuth 使用 state、PKCE、服务端 Secret、Origin 与 redirect 白名单；
- GitHub token 与 AI Key 使用会话级存储，而非长期明文 localStorage；
- 自定义 AI endpoint 只接受公网 HTTPS 且禁止凭据、query、fragment 和私网主机；
- 构建不输出 source map；
- 生产依赖审计和 CSP bundle 检查进入 `npm run check`。

## 数据模型原则

- `tags` 只存分类元数据；
- `repoTags` 是仓库—分类关系唯一事实来源；
- UI 中的 `Tag.repos` 是加载时派生结构，不能写回当作关系源；
- `repositoryHighlights` 与分类独立；
- AI 结果先进入任务草稿，人工确认后才写 `repoTags`；
- 分类治理通过稳定 ID、事务和快照保证安全迁移。

## 当前非目标

- PWA 插件在构建配置中仍被禁用，不能宣称完整离线安装；
- 没有 StarHub 云端账号、服务端数据库或跨设备自动同步；
- 没有内置个人分类体系；正式注册表由每个用户或组织维护；
- Cloudflare Function 不是通用业务后端，不接收分类或仓库数据库。

## 质量门禁

`npm run check` 是合并前最低门槛，包含：

1. ESLint（零 warning）；
2. Vue/TypeScript 类型检查；
3. 全部 Node 单元测试；
4. Functions 类型检查；
5. OAuth 文档与配置约束校验；
6. Pages 应用和文档构建；
7. CSP bundle 与静态安全校验；
8. 生产依赖审计；
9. Cloudflare Pages 输出构建。

关键功能还需人工验证，尤其是 GitHub OAuth、真实 GitHub 限流、浏览器 IndexedDB 升级、AI 供应商差异和大规模数据性能。
