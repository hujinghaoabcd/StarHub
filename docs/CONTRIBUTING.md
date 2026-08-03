# 贡献 StarHub

贡献前请阅读仓库根目录的[完整贡献指南](https://github.com/hujinghaoabcd/StarHub/blob/main/CONTRIBUTING.md)。最重要的要求是：

- 从最新 `main` 开始，使用 `npm ci`；
- 本地 OAuth 使用独立 App，Secret 只写未提交的 `.dev.vars`；
- 分类关系只通过 `repoTags` 和既有服务写入；
- AI 结果必须经过注册表、Schema、批次 ID 与人工审核；
- 新持久数据必须覆盖升级、备份、清空、撤销和测试；
- 所有新 UI 文案同时提供中文和英文；
- 提交前运行 `npm run check`；
- PR 写清数据、安全、人工验收、回滚和未完成项；
- 不上传 token、API Key、Secret、私有仓库或用户备份。

接手较大任务前先读[项目状态](development/PROJECT_STATUS.md)、[架构](reference/architecture.md)和[后续路线图](development/NEXT_PHASE_HANDOFF.md)。
