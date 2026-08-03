# 故障排除

本页是维护者和用户的快速入口。执行破坏性恢复前先导出备份；错误报告、截图和日志中不要包含 GitHub Token、AI API Key 或私人仓库内容。

## 页面无法加载或无响应

1. 强制刷新，并关闭其他 StarHub 标签页。
2. 使用最新版 Chrome、Edge、Firefox 或 Safari 重试。
3. 打开开发者工具 Console，记录第一条错误及复现步骤。
4. 若只有仓库详情连续切换后卡顿，记录仓库数量、点击次数和是否展开 README，提交性能问题；不要直接清空数据。

## GitHub 登录或同步失败

1. 检查部署变量 `VITE_API_BASE_URL` 与 `VITE_GITHUB_CLIENT_ID`。
2. 访问 Cloudflare `/api/health`，确认 `configured: true`。
3. 核对 OAuth App Homepage 和 callback URL 均指向实际 GitHub Pages 根路径。
4. 同步中断时保留旧快照，等待速率限制恢复后重试。

详见[登录问题](troubleshooting/login.md)和[部署指南](DEPLOYMENT.md)。

## AI 分类失败或部分失败

1. 检查当前会话中的 API Key、账户余额、HTTPS API 地址和模型 ID。
2. 减小批次；JSON 截断或未知 `category_id` 不得自动修补或写入。
3. 查看任务中的成功、失败和可重试数量。
4. 暂停时可确认写入当前审核项，写入后结束本次任务；剩余仓库以后创建新任务。
5. 疑难项使用 README 增强，不要对全部仓库抓取 README。

详见[AI 分类指南](guide/ai-classification.md)。

## 存储空间或 IndexedDB 错误

1. 先导出备份。
2. 关闭其他 StarHub 标签页并检查磁盘、站点存储空间。
3. 刷新重试；仍失败时记录浏览器版本和错误。
4. 最后手段是在浏览器 Application/Storage 面板删除整个 StarHub 站点数据，再重新登录并导入备份。

不要运行使用 `eval`、远程下载代码或只清理部分 IndexedDB 表的“修复脚本”。详见[存储问题](troubleshooting/storage.md)和[数据管理](config/data.md)。

## 分类迁移异常

- 不要手工删除 `tags` 或 `repoTags` 记录。
- 在分类管理中使用最近迁移快照撤销。
- 若撤销失败，停止继续写入，保留控制台错误并从迁移前备份恢复。
- 验证分类 ID、仓库关系和注册表版本一起恢复。

## 提交有效问题报告

请提供：StarHub 版本或 main commit、浏览器及版本、可复现步骤、预期与实际结果、第一条控制台错误，以及是否能在新浏览器配置中复现。敏感数据应脱敏。

- [GitHub Issues](https://github.com/hujinghaoabcd/StarHub/issues)
- [项目当前状态](development/PROJECT_STATUS.md)
- [下一阶段详细交接](development/NEXT_PHASE_HANDOFF.md)
