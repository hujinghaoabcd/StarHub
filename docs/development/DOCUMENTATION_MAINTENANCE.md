# 文档维护规范

## 文档层级

| 文档 | 作用 |
|---|---|
| `README.md` / `README.en.md` | 项目入口、核心能力、快速启动和边界 |
| `docs/guide/` | 用户如何操作当前已上线功能 |
| `docs/config/` | 精确配置、存储位置和数据格式 |
| `docs/DEPLOYMENT.md` | 唯一生产部署主文档 |
| `docs/troubleshooting/` | 以症状为入口的安全排查 |
| `docs/reference/` | 架构、功能成熟度、代码结构和技术约束 |
| `PROJECT_STATUS.md` | 当前能力和已知问题 |
| `NEXT_PHASE_HANDOFF.md` | 尚未完成的阶段、验收和接手顺序 |
| `AI_CLASSIFICATION_AUDIT.md` | AI 风险审计与修复状态 |
| `CHANGELOG.md` | 用户可感知变化，不代替状态文档 |

代码、数据库 schema 与测试是行为事实源。文档与代码不一致时，先确认真实行为，再同时修复实现或文档；不要为了让旧文档“正确”而猜测行为。

## 术语表

| 中文 | English | 说明 |
|---|---|---|
| 分类 | category | 用户组织仓库的标签实体；历史代码仍多使用 tag |
| 正式分类注册表 | managed category registry | 具有稳定 ID 和治理元数据的分类集合 |
| 仓库—分类关系 | repository-category relation | 存于 `repoTags` |
| 重点标记 | highlight | 独立于分类的优先标记 |
| AI 分类任务 | classification task | 可持久、暂停、恢复和审核的任务 |
| 元数据第一轮 | metadata pass | 不抓 README 的低成本分类 |
| README 增强 | README enhancement | 只处理候选的第二阶段 |
| 完整备份 | full backup | 当前 StarHub v4 JSON，不含全部历史表 |

用户文档优先使用“分类”，代码引用时可说明旧名称 `tag`。不要混用“收藏夹”和“重点标记”，除非产品真的增加了多收藏夹模型。

## 截图规范

当前新版截图缺失时使用以下格式：

> 截图待补：入口路径；应显示的关键状态；建议测试数据量；验收重点。

需要补齐：

1. 登录与 OAuth 授权入口；
2. 17k 级首页、搜索、筛选和分页；
3. 详情摘要卡与按钮不覆盖描述；
4. 重点标记和重点优先排序；
5. 分类注册表导入预览和冲突；
6. 分类管理搜索、排序、合并和撤销；
7. AI 任务进度、暂停、失败重试；
8. 审核表、置信度、人工评分和当前草稿写入；
9. README 二阶段差异；
10. 数据备份、清理和安全警告。

截图不得包含 GitHub token、AI Key、私有仓库、OAuth code 或个人邮箱。桌面图建议统一窗口和缩放；关键响应式页面另补窄屏图。旧截图与当前界面不符时应删除或标为历史，不要继续引用。

## 变更检查表

### 新功能

- README 功能摘要与产品边界；
- 对应 guide 和 config；
- 中英文语言包；
- 功能成熟度；
- 项目状态和 changelog；
- 截图或截图占位；
- 已知限制和失败路径。

### 数据结构

- schema 版本、表和索引；
- 升级策略；
- 备份包含/排除；
- 导入、清空、撤销和跨版本行为；
- 故障恢复；
- 路线图中的未完成兼容项。

### 部署或安全

- 变量名、所属平台、Secret/Text 类型；
- 本地/生产/自托管差异；
- 回调和 Origin 的精确格式；
- CI 与发布验收；
- 威胁边界和禁止做法。

### AI

- 注册表和任务版本；
- 发送的数据；
- 输出校验；
- 人工确认与写库时机；
- 失败、取消、重试和费用；
- 不承诺未经评测的准确率。

## 链接与构建

提交前运行：

```bash
npm run docs:build
npm run pages:build
npm run check
```

VitePress 相对链接必须通过构建。生产部署后检查 `/StarHub/docs/`、搜索索引、导航、编辑链接和资源 base path。
