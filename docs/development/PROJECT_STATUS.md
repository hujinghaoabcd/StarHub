# StarHub 项目状态

最后更新：2026-08-03

## 生产环境

- 默认分支：`main`
- 当前稳定提交：`c954570564b834383ca354800c861ba0719f60d7`（D1，PR #35）
- 应用：`https://hujinghaoabcd.github.io/StarHub/`
- 文档：`https://hujinghaoabcd.github.io/StarHub/docs/`
- OAuth API：`https://starhub-oauth.pages.dev/api`
- 生产架构：GitHub Pages 前端与文档 + Cloudflare Pages Functions OAuth API

## 已完成

### 账户、同步与安全

- [x] GitHub OAuth state、PKCE、Origin 和 redirect URI 校验
- [x] Client Secret 仅存于 Cloudflare 加密 Secret
- [x] GitHub Token 和 AI API Key 会话级存储
- [x] Stars 权威快照与原子同步
- [x] 同步、README、Pages 和 AI 请求支持取消与超时
- [x] CSP、静态安全扫描和生产依赖审计

### 仓库管理

- [x] 搜索、语言/分类筛选、完整集合排序和最大 1000 条分页
- [x] 仓库摘要、About、GitHub Pages、README 和取消 Star
- [x] README Worker 渲染、切换去抖、大小限制和缓存防护
- [x] 重点项目标记、批量操作、筛选、排序和备份

### AI 分类

- [x] 正式分类注册表和供应商结构化输出
- [x] 仓库 ID、分类 ID、重复、遗漏和输出完整性校验
- [x] 模型侧短 ID 与持久化稳定 ID 映射
- [x] 人工审核、低置信度默认不选中、原子写入和撤销
- [x] 可恢复任务、分段执行、暂停、继续、取消和失败重试
- [x] 暂停时写入当前结果并结束任务
- [x] 元数据初筛和困难项 README 增强
- [x] README 摘要缓存、增强前后对比和人工质量评测

### D1 分类体系治理

- [x] 每位用户独立的通用正式分类注册表
- [x] 稳定 ID、中英文名称、别名、说明、示例、排除项和层级
- [x] 新增、重命名、合并、更新和冲突预览
- [x] 安全重命名和关系保留合并
- [x] 迁移前快照、事务写入和一键撤销
- [x] 分类搜索、项目数量排序和空分类筛选
- [x] 长名称、颜色和侧栏排序优化
- [x] AI 只使用当前用户确认的正式注册表
- [x] 注册表 v2 版本哈希和 StarHub 备份 v4
- [x] D1 新界面中英文国际化

## 当前数据版本

- IndexedDB：v8
- StarHub 备份：v4
- 正式分类元数据：schema v2
- AI 正式注册表：`registry-v2-*`

## 当前验证基线

合并前必须执行：

```bash
npm run check
```

检查范围包括：ESLint、Vue/TypeScript、单元测试、Cloudflare Functions、OAuth 文档、GitHub Pages、CSP、静态安全、生产依赖审计和 Cloudflare 构建。

## 下一阶段

下一阶段是 **D2：未分类仓库批量处理与持续分类**，首先实施 D2-A 未分类智能队列。

详细范围、数据约束、验收标准、推荐文件和后续 D3–D5 路线图见：

- [后续开发与接手说明](NEXT_PHASE_HANDOFF.md)
- [AI 分类审计](AI_CLASSIFICATION_AUDIT.md)

## 已知但未阻塞的问题

- Element Plus 公共 chunk 仍较大；
- 尚缺完整 Playwright E2E；
- 分类治理底层部分错误信息仍需改成错误代码并由 UI 国际化；
- 分类迁移快照可能增加大数据用户的 IndexedDB 占用；
- 旧预设分类与正式注册表的产品概念仍需进一步整合。

## 更新要求

每次发布必须同步更新本文件、`CHANGELOG.md` 和 `NEXT_PHASE_HANDOFF.md`。自动测试通过不能替代生产环境人工回归。
