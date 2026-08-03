# 存储问题

StarHub 的仓库、分类、任务草稿和迁移快照保存在 IndexedDB。处理存储问题前，能进入应用时应先导出备份。

## QuotaExceededError

如果控制台显示 `QuotaExceededError` 或“存储空间已满”：

1. 导出 StarHub 备份。
2. 关闭其他 StarHub 标签页和占用大量空间的页面。
3. 在浏览器开发者工具的 **Application → Storage** 中检查当前站点用量。
4. 释放磁盘或站点存储空间后刷新重试。
5. 最后手段是在同一面板删除 StarHub 站点数据，然后重新登录并导入备份。

## DatabaseClosedError

`DatabaseClosedError` 通常由其他标签页并发操作、浏览器回收连接或存储不足引起。先关闭其他 StarHub 标签页并刷新；若持续发生，按上面的备份和站点数据恢复流程处理。

## 清空后界面仍有残留

1. 等待清空操作完成后刷新页面。
2. 确认没有另一个 StarHub 标签页重新写入旧状态。
3. 仍有残留时，导出可用数据，并通过 **Application → Storage** 删除当前站点数据。

不要在控制台执行 `eval`、远程下载脚本或手写部分表清理事务。StarHub v8 有多张相互关联的数据表，只清除部分表会造成不一致。

## IndexedDB 无法打开

- 确认浏览器支持 IndexedDB，且隐私模式没有限制持久化存储。
- 关闭其他 StarHub 标签页后重试。
- 记录浏览器版本和控制台错误；提交 Issue 前移除 Token、API Key 和私人仓库信息。
- 无法恢复时，删除当前站点数据、重新同步 GitHub，再导入最近备份。

完整的数据表、密钥存储和恢复规则见[数据管理](../config/data.md)。
