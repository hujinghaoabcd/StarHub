# StarHub 项目更新状态

## 当前概况

- 基准分支：`main`
- `main` 当前提交：`eb83325774c0e718c7e11465b06439a982f23300`
- 开发分支：`agent/ai-classification-correctness`
- 当前阶段：AI 分类阶段 B——输出与数据正确性
- 生产前端：`https://hujinghaoabcd.github.io/StarHub/`
- 生产文档：`https://hujinghaoabcd.github.io/StarHub/docs/`
- OAuth API：`https://starhub-oauth.pages.dev/api`

## 已完成基础能力

- [x] GitHub Pages 与 Cloudflare Pages Functions 部署
- [x] OAuth state、PKCE、严格 Origin 与 redirect URI 校验
- [x] OAuth popup 回调在 Vue/router 启动前转发
- [x] Stars 权威快照与 IndexedDB 原子同步
- [x] `repoTags` 单一关系真源与 IndexedDB v3 迁移
- [x] 12 小时会话级 token、401 清理与跨标签页退出
- [x] 生产依赖漏洞归零、严格 CSP 与 bundle 动态执行扫描
- [x] About Website 与 GitHub Pages 实际地址展示
- [x] 全量升降序排序与最大 1000 条分页
- [x] 应用内取消公开仓库 Star
- [x] 全局 SCSS 作用域修复与 ESLint 零 warning 门禁

## 当前批次：AI 分类阶段 B

### 输出契约

- [x] 使用实际标签 ID 作为稳定 `category_id`
- [x] 分类注册表只包含已经存在的分类
- [x] OpenAI 使用严格 JSON Schema Structured Outputs
- [x] Claude 使用原生 `output_config.format` JSON Schema
- [x] DeepSeek、Qwen 与智谱使用供应商 JSON 模式
- [x] 删除正则截取、截断 JSON 自动补括号和自由分类名
- [x] 严格校验未知、重复、遗漏仓库 ID
- [x] 严格校验未知分类 ID、置信度和理由

### 审核与写入

- [x] 模型结果先进入审核窗口，不在批次回调中写库
- [x] 显示仓库、候选分类、置信度和理由
- [x] 低于 65% 置信度的结果默认不选中
- [x] 审核时可修改分类或取消项目
- [x] 确认后通过单次 IndexedDB 事务写入全部关系
- [x] 支持撤销最近一次 AI 分类新增的关系
- [x] 部分失败只预览成功项，并显示失败数量

### 保留到后续批次

- [ ] README 只用于低置信度二次分类并写入缓存
- [ ] 分类任务暂停、恢复、失败项重试和断点续传
- [ ] 200–500 个仓库人工金标准评测集

## 历史批次：PR #18

### 详情布局

- [x] 删除独立的“项目链接”卡片
- [x] 新增组合详情组件 `RepositoryDetailView.vue`
- [x] 仓库标题、描述、语言、Star、Fork、License、更新时间保留在一个摘要卡片
- [x] About 与 GitHub Pages 地址嵌入同一摘要卡片
- [x] “取消 Star”移入摘要卡片操作区
- [x] 原 README 与标签编辑能力继续复用 `DetailView.vue`

### 分类名称导入

- [x] 主页侧栏新增“分类工具 → 导入分类”入口
- [x] 支持直接粘贴分类名称
- [x] 支持 TXT、CSV 和 JSON 文件
- [x] 支持从 StarHub 备份文件提取标签名称
- [x] 大小写不敏感去重
- [x] 忽略空名称和超过 80 字符的名称
- [x] 仅写入 `tags` 表，不写入 `repoTags`
- [x] 不读取或恢复任何仓库分类关系
- [x] 不覆盖现有分类颜色、emoji 或成员关系

### AI 分类审查

- [x] 审查 AI 配置、供应商调用、提示词、README 获取、批处理、停止、重试和数据写入链路
- [x] 识别自由文本 JSON 修复、输出未校验和未知分类自动创建风险
- [x] 识别 API Key 长期存储、自定义 baseURL 与第三方数据披露风险
- [x] 识别停止按钮不取消网络请求、批次回调未等待和失败批次被跳过问题
- [x] 提出稳定 category ID、结构化输出、人工审核、原子提交和可恢复任务架构
- [x] 形成 `docs/development/AI_CLASSIFICATION_AUDIT.md`

该历史批次只完成审计；执行引擎的正确性重构在当前阶段 B 批次实施。

## 当前自动验证

```text
Lint                            PASS，0 warning
Frontend type-check             PASS
Unit tests                      PASS，52/52
Cloudflare Functions type-check PASS
OAuth documentation verification PASS
Application + docs build        PASS
CSP bundle verification         PASS，16 个生产脚本
Static security verification    PASS
Production dependency audit     PASS，0 vulnerabilities
Cloudflare Pages bundle         PASS
GitHub Actions / Pages          待 PR 创建后执行
```

## 合并前检查

- [x] 生成阶段不创建、修改分类或写入仓库—分类关系
- [x] 只有审核确认操作可以调用事务提交
- [x] 分类结果严格绑定当前批次仓库与现有分类 ID
- [x] 自动修补或截取模型 JSON 的旧逻辑已删除
- [x] 低置信度结果默认不提交
- [x] 最新一次 AI 提交支持撤销新增关系
- [ ] 更新 PR 最终说明
- [ ] 标记 Ready 并 squash 合并到 `main`
- [ ] 生产环境检查版本与 AI 分类审核入口

## 后续优先级

### P0：AI 分类止损批次

- [x] 将 AI 分类明确标记为实验性功能
- [x] 暂停或隐藏“全部重新分类”入口
- [x] 将 AI API Key 从长期 `localStorage` 改为会话存储，增加立即清除按钮
- [x] 增加 HTTPS 与自定义 API 主机确认
- [x] 为所有 GitHub 与 AI 请求加入 timeout 和 `AbortController`
- [x] 修复批次回调未等待和部分失败仍显示完整成功

### P1：AI 分类第二版

- [x] 建立稳定 `category_id` registry
- [x] 使用 JSON Schema/Structured Output
- [x] 校验输入仓库 ID、重复 ID、遗漏 ID 与非法分类 ID
- [x] 结果先进入审核队列，不直接写库
- [x] 审核通过后一次性事务提交并支持回滚
- [ ] README 仅用于低置信度二次分类并进行缓存

### P1：性能与 E2E

- [ ] 为 1000 条列表接入虚拟滚动
- [ ] 增加 Playwright 浏览器 E2E
- [x] 为 Stars 同步请求加入真正的网络取消
- [ ] 拆分超过 1 MB 的 Element Plus 与公共依赖 chunk

## 下一步

1. 完成阶段 B 自动检查、PR 与生产部署；
2. 用 10–30 个仓库人工检查一次审核与撤销流程；
3. 开始阶段 C：元数据优先、低置信度 README 二次分类与缓存；
4. 为万级任务增加可恢复进度和失败项重试。

## 更新规则

每一批记录：已完成、未完成、修改文件、验证结果、已知风险、人工验收和下一步。自动检查通过不得表述为真实浏览器行为已经完成人工验收。
