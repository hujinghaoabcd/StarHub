# StarHub 开发交接文档

## 1. 当前状态

```text
生产前端：https://hujinghaoabcd.github.io/StarHub/
生产文档：https://hujinghaoabcd.github.io/StarHub/docs/
OAuth API：https://starhub-oauth.pages.dev/api
main：f967f282ef161713af928d1f60dce4a9a8cfb06a
开发分支：agent/detail-layout-tag-import-ai-audit
Pull Request：#18
```

PR #18 处理三个目标：详情卡片整合、仅分类名称导入、旧 AI 分类链路审查。

## 2. 详情页结构

原实现把 About、GitHub Pages 和取消 Star 放在独立的“项目链接”卡片中，导致右侧详情区重复出现两个顶部卡片。

当前使用 `RepositoryDetailView.vue` 组合：

```text
RepositoryDetailView
├── 单一仓库摘要卡片
│   ├── 仓库名称与描述
│   ├── GitHub 按钮
│   ├── 语言 / Star / Fork / License / 更新时间
│   ├── About
│   ├── GitHub Pages
│   └── 取消 Star
└── DetailView
    └── README、标签编辑和其余详情能力
```

`DetailView.vue` 原有仓库摘要卡片在组合模式中通过 scoped deep selector 隐藏，README 与标签逻辑继续复用，没有复制 GitHub 请求和 Markdown 渲染代码。

主要文件：

- `src/pages/Home/components/RepositoryDetailView.vue`
- `src/pages/Home/components/RepositoryOverview.vue`
- `src/pages/Home/index.vue`

## 3. 分类名称导入

入口位于主页左侧顶部：

```text
分类工具 → 导入分类
```

支持：

- 直接粘贴，每行一个名称；
- 逗号、中文逗号、分号、中文分号和 Tab 分隔；
- `.txt`；
- `.csv`；
- JSON 字符串数组；
- 包含 `name` 的对象数组；
- `{ tags: [...] }`；
- StarHub 备份 `{ data: { tags: [...] } }`。

导入语义必须保持为：

```text
只创建分类名称
不导入仓库
不恢复仓库—分类关系
不修改现有分类
不覆盖颜色或 emoji
```

数据路径：

```text
TagNameImportDialog
→ parseTagNameImport
→ importTagNames（共享 dataMutationQueue）
→ 只 bulkAdd 到 db.tags
→ tagStore.loadTags 刷新 UI
```

持久化服务不引用 `db.repoTags`、`repoId` 或 `repos`。

主要文件：

- `src/pages/Home/components/TagNameImportDialog.vue`
- `src/services/tagNameImport.ts`
- `src/services/tagNameImportPersistence.ts`
- `tests/tag-name-import.test.mjs`
- `tests/detail-category-import-ui.test.mjs`

## 4. AI 分类审查结论

完整审查见：

```text
docs/development/AI_CLASSIFICATION_AUDIT.md
```

当前功能应视为 Legacy / Experimental，而不是成熟的大规模自动分类系统。

### P0 数据正确性问题

- 模型输出仅靠提示词要求 JSON，没有结构化输出或 schema；
- 通过正则提取并手工补括号，可能接受被截断的不完整结果；
- 未校验模型返回的仓库 ID 是否属于当前批次；
- 未检测重复、遗漏或冲突分类；
- 模型可以自由创造新分类名称；
- 分类结果边生成边写入，没有预览、批次回滚和原子接受；
- “全部重新分类”直接操作 Dexie，并绕过当前 canonical tag data layer。

### P0 安全与隐私问题

- AI API Key 保存在长期 `localStorage`；
- README、描述、topics 等内容直接发送给第三方供应商；
- 执行前没有明确展示发送字段、供应商和仓库数量；
- README 是不可信输入，可能包含提示注入；
- 自定义 baseURL 可以让浏览器把 API Key 发到任意地址。

### P1 批处理问题

- “停止”仅设置布尔值，不中止已发出的请求；
- 批次完成回调通过 `.catch()` 异步启动，没有 `await`；
- 上一批数据库写入完成前可能开始下一批；
- 非 429 错误会跳过批次，但最后仍可能显示完整成功；
- 限流使用固定等待，不读取 `Retry-After`；
- README 串行获取且没有缓存；
- 固定 `max_tokens: 2000` 容易截断批量 JSON。

### 分类设计问题

- 分类以名称作为身份，没有稳定 `category_id`；
- AI 要求单一分类，但数据模型允许多标签，语义没有定义；
- 没有“不确定”、confidence、reason 和人工审核队列；
- README 只截取前 500 字符；
- 没有金标准数据集和可复现评测；
- 产品页“95% 准确率”目前没有可复现实验支撑。

## 5. 推荐 AI 分类第二版

```text
Category Registry
  稳定 category_id、名称、描述、示例、排除条件

Repository Feature Builder
  元数据优先，低置信度时才补 README 摘要

Classification Job Planner
  job ID、批次、取消、暂停、重试、断点续传

Provider Adapters
  OpenAI / Anthropic / OpenAI-compatible

Structured Result Validator
  JSON Schema、输入 ID 白名单、分类 ID 枚举

Review Queue
  预览、逐条接受、批量接受、低置信度处理

Atomic Commit
  审核后统一通过 dataMutationQueue 写入并可回滚
```

## 6. 建议实施顺序

### 阶段 A：立即止损

1. 标记为实验性；
2. 暂停“全部重新分类”；
3. AI Key 改为有期限的会话存储并提供清除按钮；
4. 自定义 API 地址要求 HTTPS 和主机确认；
5. 加入 timeout 与 AbortController；
6. `await` 每个批次写入；
7. 部分失败不得显示完整成功。

### 阶段 B：正确性

1. 稳定 category ID；
2. 结构化输出；
3. 运行时 schema 校验；
4. 输入/输出 ID 完整性校验；
5. 禁止模型自动创建未知分类；
6. 结果预览；
7. 一次性事务提交与回滚。

### 阶段 C：规模化

1. 元数据优先；
2. README 摘要缓存；
3. 只对低置信度项目补 README；
4. 可恢复任务；
5. 失败项重试；
6. 真实网络取消。

### 阶段 D：评测

1. 建立 200–500 个仓库人工标注集；
2. 记录模型、提示词和分类表版本；
3. 报告 accuracy、macro-F1、未分类率、低置信度比例、成本与耗时；
4. 模型或提示词升级必须通过回归评测。

## 7. 自动验证

```text
PR head                         61d7c1c34e4e296780080b8fe3b3161443521149
CI run                          30776242027 PASS
GitHub Pages PR run             30776241662 PASS
Lint                            PASS，0 warning
Frontend TypeScript             PASS
Unit tests                      PASS
Functions TypeScript            PASS
Application + docs build        PASS
CSP / static security           PASS
Production audit                PASS，0 vulnerabilities
Cloudflare bundle               PASS
```

## 8. 生产人工验收

### 详情卡片

1. 打开一个仓库；
2. 确认顶部只有一个仓库摘要卡片；
3. 确认 About、GitHub Pages 和取消 Star 在同一卡片；
4. 确认 README 正常显示；
5. 确认关闭按钮和取消 Star 仍工作。

### 分类名称导入

1. 建立 TXT：每行一个分类名称；
2. 点击“分类工具 → 导入分类”；
3. 确认预览数量；
4. 导入后确认分类出现；
5. 确认新分类成员数量全部为 0；
6. 再次导入相同文件，确认全部跳过；
7. 导入包含 `repos` 的备份 JSON，确认只提取名称。

## 9. 下一步

1. 更新 PR #18 最终说明；
2. 标记 Ready 并 squash 合并；
3. 等待生产发布并完成布局/导入人工验收；
4. 开始 AI 分类阶段 A 止损批次。
