# StarHub AI 分类功能审查（2026-08）

> 实施状态：本文件保留最初审查基线。C1/C2-A 已完成元数据任务、严格输出校验、人工审核与试验评测；C2-B 已完成疑难项 README 按需缓存、提示注入防护、增强复分类及前后对比审核。以下“当前链路”和问题描述用于说明旧实现，不代表最新代码仍存在同样问题。

## 结论

当前 AI 分类功能可以作为早期原型保留，但不适合继续按现状扩展或用于大规模自动重分类。

主要原因不是模型能力不足，而是当前实现同时存在：凭据长期存储、输出格式不受约束、分类结果直接写库、批处理无法真正取消、错误批次被静默跳过、旧数据模型绕行、模型与限流规则硬编码、缺少审核与回滚等问题。

建议将现有功能标记为 **Legacy / Experimental**，保留“只分类未分类仓库”的入口；在完成第二版任务引擎前，不建议继续强化“全部重新分类”。

## 当前链路

```text
SideMenu
  → 可选：逐个获取 README
  → services/ai.ts 按批调用模型
  → 从自由文本中提取并修复 JSON
  → 根据返回 category 名称查找或创建标签
  → 每个类别分别更新 IndexedDB
  → 重新加载标签 Store
```

## 关键问题

### P0：数据正确性

1. **返回结果没有严格结构约束**
   - 只在提示词中要求 JSON。
   - 未使用 OpenAI Structured Outputs、JSON Mode 或供应商对应的结构化输出能力。
   - 当前通过正则提取 JSON，并尝试手工补齐括号；被截断的结果可能被“修复”为可解析但不完整的数据。

2. **没有完整校验输入与输出的一一对应关系**
   - 未验证返回的仓库 ID 是否属于当前批次。
   - 未检测重复 ID。
   - 未检测遗漏仓库。
   - 未检测同一仓库被模型返回多个互相冲突的主分类。

3. **模型可以创建不在允许列表中的新分类**
   - AI 返回任何新字符串，界面都会自动创建新标签。
   - 类别名称、英文名称、emoji 和描述之间没有稳定 ID，容易产生同义重复分类。

4. **批次写入不是单次可回滚提交**
   - 一个批次可能先成功写入部分分类，再在后续类别失败。
   - 当前没有 job checkpoint、撤销记录或整批回滚。

5. **“全部重新分类”绕过现有标签数据层**
   - SideMenu 直接操作 Dexie 表。
   - 仍尝试清空已经不再作为关系真源的旧 `tags.repos` 字段。
   - 该流程没有统一经过 `dataMutationQueue` 和 `tagStore` 的事务接口。

### P0：安全与隐私

1. **AI API Key 长期保存在 localStorage**
   - 任意同源脚本或 XSS 都可以读取。
   - 应至少迁移到带过期时间的 sessionStorage；更完整的方案是由 Cloudflare 后端代理并使用服务端密钥。

2. **README、仓库名称、topics 和描述直接发送到第三方供应商**
   - 界面没有在执行前明确展示“将发送哪些字段、发送给哪个供应商、预计多少仓库”。
   - README 属于不可信输入，也可能包含提示注入内容。

3. **自定义 baseURL 缺少协议和目标限制**
   - 浏览器会把 API Key 发送到用户填写的任意地址。
   - 至少需要 HTTPS 校验、主机预览和再次确认。

### P1：批处理与恢复

1. **停止按钮不取消网络请求**
   - 仅设置布尔标志。
   - 已发出的 GitHub README 请求和模型请求会继续运行。
   - 应使用 AbortController，并把 signal 传入所有 fetch。

2. **批次完成回调未被等待**
   - `onBatchComplete(...).catch(...)` 异步执行，下一批可在上一批数据库写入完成前开始。
   - 这可能引发标签重复创建、进度提前结束和写入竞态。

3. **非 429 错误会直接跳过整批**
   - 最终仍显示“所有批次处理完成”。
   - 应返回 completed / partial / failed / cancelled，并列出失败仓库。

4. **限流策略依赖过时的固定延迟**
   - OpenAI 固定等待 25 秒，其他供应商固定 2–5 秒。
   - 应读取 `Retry-After`、速率限制响应头，并采用指数退避和随机抖动。

5. **README 获取为串行请求且没有缓存**
   - 数千仓库时耗时和 GitHub API 配额成本很高。
   - 应先仅用元数据分类；只对低置信度仓库按需补充 README，并缓存摘要。

### P1：模型与供应商适配

1. **供应商逻辑集中在单个文件中**
   - 响应结构、认证、错误解析、结构化输出能力混在一起。
   - 应拆成 `OpenAIAdapter`、`AnthropicAdapter`、`OpenAICompatibleAdapter` 等。

2. **默认模型已经陈旧**
   - Claude 默认仍是 `claude-3-5-sonnet-20241022`。
   - 智谱默认仍是旧 `glm-4-flash`。
   - 模型不应永久写死；应提供推荐模型配置版本、用户自定义模型和连接测试结果。

3. **没有使用供应商结构化输出能力**
   - OpenAI 支持 JSON Schema Structured Outputs。
   - Qwen 与 DeepSeek 的 OpenAI 兼容接口支持 `response_format: {"type":"json_object"}`。
   - 智谱当前模型文档也声明支持结构化输出。

4. **固定 max_tokens 容易截断批量 JSON**
   - 当前所有供应商固定 2000 输出 token。
   - 分类数量增加后会直接产生截断结果。
   - 应按仓库数量估算输出预算，或改为每仓库独立对象/小批次；使用 Qwen JSON Mode 时不应继续固定低 `max_tokens`。

### P1：分类设计

1. **分类使用名称而不是稳定 ID**
   - 中英文切换、emoji、描述变化都可能导致重复。
   - 应让模型返回 `category_id`，显示名称只作为 UI 元数据。

2. **没有“不确定”与人工复核队列**
   - 当前所有输出直接写入。
   - 应返回 confidence、reason、evidence，并为低置信度结果提供审核队列。

3. **没有明确单标签还是多标签策略**
   - 数据模型支持一个仓库多个标签，但 AI 提示词实际要求一个 category。
   - 建议区分：一个主分类 + 0–3 个辅助标签。

4. **README 只截取前 500 字符**
   - 很多项目的有效介绍位于徽章、目录或更后位置。
   - 应先清理徽章和 HTML，再提取标题、首段、Topics、语言与关键章节摘要。

5. **缺少可复现评测**
   - 没有人工标注测试集、准确率、宏平均 F1、覆盖率或低置信度比例。
   - 界面中的“95% 准确率”不应继续作为产品承诺，除非建立可复现评测。

## 建议的第二版架构

```text
1. Category Registry
   稳定 category_id + 中英文名称 + 描述 + 示例 + 排除条件

2. Repository Feature Builder
   name / description / language / topics
   → 仅低置信度时获取并缓存 README 摘要

3. Classification Job Planner
   任务 ID、批次、暂停、取消、重试、断点续传、失败清单

4. Provider Adapters
   OpenAI / Anthropic / OpenAI-compatible
   统一 timeout、AbortSignal、Retry-After、usage、request-id

5. Structured Result Validator
   JSON Schema + 允许 category_id 枚举 + 输入 ID 白名单

6. Review Queue
   先预览，不立即覆盖；支持逐条接受、批量接受和回滚

7. Atomic Commit
   一个审核批次通过后，统一通过 tagStore/dataMutationQueue 写入
```

## 分阶段修改建议

### 实施状态（2026-08-03）

- 阶段 A 已完成：实验性标识、会话级密钥、端点校验、超时与真正取消已上线。
- 阶段 B 已完成：结构化输出、严格 ID 校验、稳定分类注册表、人工审核、原子提交与撤销已上线。
- 阶段 C1 已完成：元数据优先、IndexedDB 持久化任务、暂停/恢复/取消、失败项重试、分页审核和任务版本保护已上线。
- 阶段 C2 待实施：只对低置信度项目按需补充并缓存 README 摘要。
- 阶段 D 待实施：人工金标准数据集与可重复的质量/成本评测。

### 阶段 A：立即止损

- 将 AI 分类标记为实验性功能。
- 暂时隐藏或禁用“全部重新分类”。
- API Key 改为会话级存储，并增加清除按钮。
- 删除固定供应商延迟说明和过时的免费账户限流估算。
- 所有请求加入 timeout 与 AbortController。
- 等待批次写入完成后再进入下一批。

### 阶段 B：输出与数据正确性

- 引入结构化输出和运行时 schema 校验。
- 模型只返回 category_id，不允许自由创建分类。
- 校验未知 ID、重复 ID、遗漏 ID和非法 category_id。
- 失败批次保留在待处理列表，不显示完整成功。
- 增加结果预览和一次性事务提交。

### 阶段 C：大规模性能

- 元数据优先分类；README 只用于低置信度二次判断。
- README 摘要缓存到 IndexedDB，并记录更新时间。
- 分类任务支持暂停、恢复、重试失败项和真正取消。
- 对 1 万级仓库使用异步批处理或可恢复后台任务，而不是保持浏览器页面长时间运行。

### 阶段 D：质量评估

- 建立 200–500 个仓库的人工金标准测试集。
- 记录模型、提示词版本、category registry 版本。
- 报告 accuracy、macro-F1、未分类率、低置信度比例、成本和耗时。
- 提示词或模型升级必须先通过回归评测。

## 本批范围

本批只完成：

- 详情页卡片布局调整；
- 分类名称导入；
- AI 分类现状审查与改造方案。

AI 分类执行逻辑本批不直接重写，避免在缺少评测基线时同时改变提示词、模型和数据写入行为。

## 官方参考

- OpenAI Structured Outputs / Responses API：`https://platform.openai.com/docs/api-reference/responses`
- Anthropic Messages API 与模型文档：`https://docs.anthropic.com/`
- DeepSeek JSON Output：`https://api-docs.deepseek.com/guides/json_mode/`
- Qwen Structured Output：`https://help.aliyun.com/en/model-studio/qwen-structured-output`
- 智谱 GLM 模型文档：`https://docs.bigmodel.cn/cn/guide/start/model-overview`
