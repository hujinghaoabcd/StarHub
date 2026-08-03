# 贡献指南

欢迎提交缺陷、文档、测试、性能改进和功能。StarHub 保存用户本地整理数据并能调用 GitHub 与 AI API，因此数据安全、可恢复和明确的用户控制优先于功能数量。

## 开始前

1. 搜索现有 [Issues](https://github.com/hujinghaoabcd/StarHub/issues) 和 Pull Requests；
2. 阅读[项目状态](docs/development/PROJECT_STATUS.md)与[路线图](docs/development/NEXT_PHASE_HANDOFF.md)；
3. 对 schema、OAuth、安全边界或大规模 AI 改动，先用 Issue 对齐设计；
4. 不要在 Issue、截图、日志或测试夹具中提交 token、API Key、Secret、OAuth code、私有仓库或个人备份。

## 本地环境

```bash
git clone https://github.com/<your-account>/StarHub.git
cd StarHub
npm ci
cp .dev.vars.example .dev.vars
```

创建本地 GitHub OAuth App，Homepage 与 callback 都设为 `http://localhost:5173/`。把服务端四个变量写入 `.dev.vars`，同一 Client ID 写入未提交的 `.env.local`：

```ini
VITE_GITHUB_CLIENT_ID=your_local_client_id
```

分别启动：

```bash
npm run cloudflare:dev
npm run dev
```

完整步骤见[本地安装](docs/guide/installation.md)。

## 工程规则

- TypeScript 与 Vue Composition API；
- 通过现有 service/store 边界写数据，不在组件中直接拼接 Dexie 事务；
- `repoTags` 是分类关系唯一事实源；
- 网络请求具有 timeout、AbortSignal、可理解错误和安全日志；
- AI 结果先验证和审核，不能直接写分类；
- 新持久表/字段同时覆盖 schema 升级、备份、导入、清空、回滚、测试和文档；
- 新文案同时加入 `zh.ts` 与 `en.ts`，英文 fallback 不代替完整翻译；
- 不新增 `unsafe-eval`，不把 Secret 放入 `VITE_*`；
- 产品保持通用，不提交个人分类清单作为所有用户默认注册表。

## 测试

提交前必须运行：

```bash
npm run check
```

UI 或真实集成改动还需记录人工测试。数据迁移至少覆盖旧数据升级、正常迁移、冲突、失败回滚和重复执行；大规模功能应使用合成数据测试 10k+ 场景。

## 文档与截图

功能 PR 同时更新用户指南、配置/数据文档、CHANGELOG、项目状态和必要的中英文 README。截图暂缺时写清入口、关键状态和验收内容；不得继续使用与当前界面不一致的旧截图。详见[文档维护规范](docs/development/DOCUMENTATION_MAINTENANCE.md)。

## 提交与 Pull Request

建议分支：`feature/...`、`fix/...`、`docs/...`、`refactor/...`。使用 Conventional Commits，例如：

```text
feat(classification): add incremental queue preview
fix(storage): clear persisted AI task tables on full reset
docs: refresh deployment and handoff guides
```

PR 描述至少包括：

- 问题与改动范围；
- 不做什么；
- 数据结构/备份影响；
- 安全与隐私影响；
- 自动与人工验证；
- 中文/英文文案状态；
- 截图或截图待补说明；
- 回滚方式和后续未完成项。

保持 PR 小而可独立发布。不要混入格式化全仓库、无关依赖升级或个人数据。

## 报告缺陷

提供 StarHub 地址、`deployment-info.json` 提交、浏览器/系统、复现步骤、期望与实际行为、数据量级和已脱敏错误。AI 问题可提供供应商与模型 ID，但不要提供 Key；数据问题不要上传完整备份，可构造最小脱敏样本。
