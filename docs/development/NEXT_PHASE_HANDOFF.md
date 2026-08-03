# StarHub 后续开发与接手说明

> 本文是当前最重要的接手入口。新维护者应先阅读本文，再阅读 `PROJECT_STATUS.md`、`AI_CLASSIFICATION_AUDIT.md` 和相关模块源码。

## 1. 产品原则

StarHub 是面向多用户的 GitHub Stars 管理工具，不是某一位用户的个人分类器。

必须长期保持以下约束：

1. 不在产品中内置某个用户的个人分类清单；
2. 每位用户的分类、注册表、仓库关系和任务均保存在自己的浏览器 IndexedDB；
3. AI 只能选择用户已经确认的正式分类，不能创建或改写分类名称；
4. 分类结果必须先进入审核草稿，再由用户确认写入；
5. 重命名不得改变分类 ID，合并不得丢失仓库关系；
6. 大规模操作必须可暂停、可恢复、可重试、可审计；
7. API Key 和 GitHub Token 不得进入长期明文存储、日志或构建产物。

## 2. 当前生产状态

| 项目 | 状态 |
|---|---|
| 默认分支 | `main` |
| D1 合并 PR | `#35` |
| D1 生产提交 | `c954570564b834383ca354800c861ba0719f60d7` |
| 生产应用 | `https://hujinghaoabcd.github.io/StarHub/` |
| 生产文档 | `https://hujinghaoabcd.github.io/StarHub/docs/` |
| OAuth API | `https://starhub-oauth.pages.dev/api` |
| D1 CI | 通过 |
| D1 GitHub Pages | 通过 |
| D1 Cloudflare 预览 | 通过 |

当前前端与 OAuth API 分离：GitHub Pages 承载应用和文档，Cloudflare Pages Functions 只承载 OAuth API。

## 3. 已完成的重要批次

### AI 正确性与可恢复任务

- 供应商结构化 JSON 输出；
- 仓库 ID、分类 ID、重复项、遗漏项严格校验；
- 模型侧使用短 ID，写库前映射回稳定分类 ID；
- 人工审核、低置信度默认不选中；
- 原子写入和最近一次写入撤销；
- 任务、草稿、分段进度保存在 IndexedDB；
- 暂停、继续、取消、失败项重试；
- 元数据初筛与低置信度 README 增强；
- README 摘要缓存和提示词注入防护；
- 暂停状态可以写入当前结果并结束任务。

### 仓库与界面稳定性

- Stars 权威快照同步；
- 请求取消、超时和陈旧响应防护；
- README Worker 渲染、大小上限与切换去抖；
- 仓库详情摘要卡片合并；
- 重点项目独立存储、筛选、排序和批量操作；
- 最大 1000 条分页和完整集合排序。

### D1：分类体系治理与安全迁移

- 通用正式分类注册表；
- 稳定 `registryKey` 和分类 ID；
- 中英文名称、别名、说明、示例、排除项和层级；
- 导入前新增、重命名、合并、更新和冲突预览；
- 安全重命名，分类 ID 不变；
- 合并分类时完整迁移并去重 `repoTags`；
- 每次迁移自动保存完整快照；
- 一键撤销上次迁移；
- 分类搜索、项目数量排序和空分类筛选；
- 正式注册表启用后，AI 只读取正式分类；
- 注册表内容进入 `registry-v2-*` 版本哈希；
- StarHub 备份格式升级到 v4；
- 新建分类颜色去重、长名称缩略和层级排序；
- D1 管理界面中英文国际化。

## 4. 当前数据模型

### IndexedDB v8

| 表 | 主键/作用 |
|---|---|
| `repos` | GitHub 仓库快照，主键 `id` |
| `tags` | 分类元数据，主键稳定 `id` |
| `repoTags` | 仓库—分类关系，复合主键 `[repoId+tagId]` |
| `classificationTasks` | AI 分类任务头信息 |
| `classificationTaskItems` | 逐仓库任务草稿和审核状态 |
| `classificationReadmeCache` | 有界 README 摘要缓存 |
| `repositoryHighlights` | 重点项目，独立于分类关系 |
| `categoryMigrationSnapshots` | 分类迁移前完整快照，最多保留 10 份 |

`repoTags` 是唯一关系真源。`Tag.repos` 只在加载时派生，禁止重新把 `repos` 数组持久化进 `tags` 表。

### 正式分类元数据

```ts
interface CategoryRegistryMetadata {
  schemaVersion: 2
  managed: true
  registryKey: string
  sourceVersion: string
  nameZh: string
  nameEn: string
  aliases: string[]
  descriptionZh: string
  descriptionEn: string
  examples: string[]
  exclusions: string[]
  level1?: string
  level2?: string
}
```

只要存在正式分类，AI 注册表就排除普通临时分类。普通分类仍在界面和项目关系中保留。

## 5. 下一阶段：D2 未分类仓库批量处理与持续分类

### D2-A：未分类智能队列（下一位维护者首先实施）

目标：只处理没有任何正式分类关系的仓库，并在万级数据下保持可恢复和幂等。

#### 功能范围

1. 新增统一的“待分类队列”统计：总仓库、正式已分类、待分类、任务中、失败；
2. 未分类判断必须基于正式分类 ID 集合和 `repoTags`，不能仅检查任意标签；
3. 支持全部待分类、当前筛选结果、随机抽样和指定数量；
4. 创建任务时保存仓库 ID 快照，任务运行期间同步变化不得修改该快照；
5. 已在其他未结束任务中的仓库不得重复入队；
6. 第一轮只发送名称、描述、语言和 Topics；
7. 低于阈值或人工判错的项目才读取 README；
8. 分段执行，每段审核写入后再进入下一段；
9. 支持只重试失败项、只复核低置信度项；
10. 写入前再次检查仓库和注册表版本，防止陈旧任务提交。

#### 推荐实现位置

- `src/services/classificationQueue.ts`：纯队列规划和幂等判断；
- `src/services/classificationTasks.ts`：任务持久化和兼容校验；
- `src/stores/classificationTask.ts`：任务状态；
- `src/pages/Home/components/ClassificationTaskStartDialog.vue`：范围与成本预览；
- `src/pages/Home/components/ClassificationReviewDialog.vue`：队列统计和重试筛选；
- `tests/classification-queue.test.mjs`：纯逻辑回归测试。

#### D2-A 验收标准

- 已有正式分类的仓库不调用 AI；
- 同一仓库不会同时存在于两个开放任务；
- 刷新页面后任务和当前分段可恢复；
- 暂停、取消、网络失败不丢失已生成草稿；
- 重试只调用失败仓库；
- README 只用于困难项；
- 写入不删除已有分类关系；
- 17,000 个仓库的队列规划不阻塞主线程；
- 中英文界面均无新增硬编码文案。

### D2-B：同步后的持续分类

目标：每次 GitHub 同步后识别新增 Star，但不在用户未确认时自动产生 AI 费用。

#### 功能范围

- 同步完成后计算新增且未正式分类的仓库；
- 新仓库进入本地待分类队列；
- 首页显示“新增待分类”入口；
- 用户主动点击后才创建 AI 任务；
- 取消 Star 后从未开始队列移除；
- 已生成草稿的取消 Star 项标记为不可提交；
- 保留最近一次队列生成时间和来源同步 ID；
- 可关闭持续分类提醒。

#### 验收标准

- 同步不直接调用 AI；
- 新增仓库只进入一次队列；
- 删除仓库不会留下孤立任务项或关系；
- 队列状态和同步状态相互独立；
- 断网或部分同步不得基于不完整快照生成队列。

### D2-C：规模化与成本透明

- 记录供应商、模型、提示词版本、注册表版本、批次大小；
- 显示估算与实际 Token、耗时、成功率、失败代码；
- 任务历史分页、搜索、导出和安全清理；
- README 缓存命中率、容量和过期策略；
- 任务列表和审核表格虚拟化；
- 支持按更新时间、语言、Star 数、置信度设置优先级；
- 对浏览器关闭、存储配额不足和供应商限流给出明确恢复路径。

## 6. D2 之后的路线图

### D3：性能与大数据量体验

1. 仓库列表和分类列表接入稳定的虚拟滚动；
2. 拆分 Element Plus 大型公共 chunk；
3. 使用 Web Worker 规划超大分类队列；
4. 为 IndexedDB 查询增加基准测试；
5. 记录 1k、10k、20k 仓库的加载、搜索、筛选和任务创建耗时；
6. 处理浏览器内存压力和 IndexedDB 配额预警。

### D4：端到端质量保障

1. Playwright 覆盖登录回调模拟、分类导入预览、冲突阻止、合并和撤销；
2. 覆盖任务暂停、刷新恢复、失败重试和分段提交；
3. 覆盖中英文切换与关键文案；
4. 覆盖深色/浅色主题；
5. 为 Pages 子路径和自托管根路径分别构建；
6. 引入无障碍检查和键盘操作测试。

### D5：安全与可选后端

前端本地模式继续作为默认。只有在明确产品需求后才增加后端：

- AI 供应商代理，避免浏览器直接持有供应商 Key；
- 可选的加密跨设备同步；
- 长任务服务端执行和通知；
- 多设备冲突解决与版本历史。

不得在没有威胁模型、加密方案和数据删除机制时上传用户 Stars、README 或分类数据。

## 7. 已知风险与技术债

1. 分类治理服务中的部分底层错误信息仍是中文；新功能应逐步改为错误代码并由 UI 国际化；
2. 旧的“预设分类”配置与正式注册表是两套概念，后续应在 UI 中进一步解释或迁移；
3. 分类迁移快照只保留最近 10 份且未导出到备份，这是刻意设计，但需要在文档中保持说明；
4. `categoryMigrationSnapshots` 保存完整关系，大量分类关系会增加本地存储；后续可压缩或保存差异；
5. Element Plus chunk 较大，构建会给出 chunk size warning；
6. 当前自动化测试以纯逻辑和源码约束为主，仍缺完整浏览器 E2E；
7. GitHub OAuth App 只允许单一回调地址，本地开发应使用独立 OAuth App；
8. Cloudflare 只部署 OAuth API，不应误把 Cloudflare 预览当作正式前端。

## 8. 修改时必须遵守的事务规则

- 分类重命名：只更新 `tags` 元数据，不改 ID；
- 分类合并：同一事务中更新 `tags`、重映射并去重 `repoTags`；
- 正式注册表迁移：先预览冲突，再在事务中保存快照和新状态；
- AI 提交：只添加审核通过的关系，不清空旧关系；
- 全量同步：只有 GitHub 完整快照成功后才替换本地仓库；
- 数据覆盖导入和清空：同步清理分类迁移快照；
- 所有写操作经过 `dataMutationQueue` 串行化。

## 9. 验证与发布命令

最小开发检查：

```bash
npm run lint
npm run type-check
npm run test:unit
```

合并前完整检查：

```bash
npm run check
```

完整检查包括前端和 Cloudflare 类型检查、单元测试、OAuth 文档校验、GitHub Pages 构建、CSP 扫描、静态安全策略、生产依赖审计和 Cloudflare 构建。

## 10. 发布流程

1. 从最新 `main` 创建 `agent/<description>`；
2. 只提交本批相关文件；
3. 本地运行 `npm run check`；
4. 创建 Draft PR，并写清数据迁移、安全边界和验证结果；
5. 标记 Ready，等待 PR 的 CI、Pages 构建和 Cloudflare 预览；
6. 全部成功后 squash merge；
7. 等待 `main` 的 CI 和 `Deploy GitHub Pages`；
8. 无痕窗口打开生产应用和文档；
9. 检查 `/api/health`、登录、IndexedDB 升级和本批关键路径；
10. 更新 `PROJECT_STATUS.md`、`CHANGELOG.md` 和本文。

当前协作环境优先使用已授权 GitHub 连接器，不依赖本地 `gh` 登录。

## 11. D1 人工回归清单

1. 中文和英文分别打开“导入分类”和“分类管理”；
2. 导入两个全新分类，确认预览显示新增；
3. 导入现有分类的新名称，确认显示重命名且 ID 不变；
4. 使用两个同义名称触发合并，确认项目数量完整；
5. 制造一个冲突，确认“应用”按钮禁用；
6. 执行迁移后点击撤销，确认分类和项目关系完整恢复；
7. 搜索分类、切换项目数排序和空分类筛选；
8. 创建 AI 任务，确认模型只能看到正式注册表分类；
9. 导出 v4 备份并重新导入，确认注册表元数据保留；
10. 刷新页面，确认 IndexedDB v8 数据仍可读取。

## 12. 新维护者开始工作的顺序

1. 拉取最新 `main`；
2. 运行 `npm ci` 和 `npm run check`；
3. 阅读本文件和 `AI_CLASSIFICATION_AUDIT.md`；
4. 阅读 `src/db/index.ts`、`tagRelations.ts`、`categoryGovernance.ts`、`classificationTasks.ts`；
5. 在测试中先实现 D2-A 的纯队列规划；
6. 再接入 Pinia 和对话框；
7. 保持每一个小批次都可独立发布和回滚。

如果时间有限，优先保证数据不丢失、AI 不越权分类、任务可恢复和文档与真实行为一致；视觉微调可以放到后续批次。
