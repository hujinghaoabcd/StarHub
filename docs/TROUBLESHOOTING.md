# 故障排除总览

排查前先不要清空浏览器数据。StarHub 的仓库关系、重点标记和 AI 任务主要保存在本机 IndexedDB，贸然清空会失去尚未导出的本地整理结果。

## 安全排查顺序

1. 记录页面提示、操作步骤、浏览器版本和发生时间；
2. 截图 Console 与 Network 中相关错误，但遮盖 token、API Key 和 OAuth code；
3. 从设置页导出 StarHub v4 备份；
4. 刷新页面或在同一浏览器重新打开；
5. 根据下表进入专项排查；
6. 只有在确认备份有效后才考虑清除数据。

## 症状索引

| 症状 | 专项文档 | 常见原因 |
|---|---|---|
| GitHub 登录失败、回调循环、CORS | [登录问题](troubleshooting/login.md) | OAuth 四处配置不一致、会话过期 |
| 仓库数量不对、同步中断 | [常见问题](troubleshooting/faq.md#同步与仓库数量) | GitHub 限流、同步尚未结束、取消 Star 后待同步 |
| 点击多个项目后卡顿 | [常见问题](troubleshooting/faq.md#详情与-readme-卡顿) | README 渲染、旧浏览器缓存或异常大文档 |
| AI JSON 错误、未知分类 ID | [常见问题](troubleshooting/faq.md#ai-分类) | 输出截断、注册表版本改变、供应商能力差异 |
| 暂停后不能写入 | [常见问题](troubleshooting/faq.md#ai-分类) | 没有有效草稿，或任务状态不允许提交 |
| 分类重复、合并冲突 | [存储与数据](troubleshooting/storage.md) | 导入清单冲突、普通分类尚未治理 |
| 数据不见、备份导入异常 | [存储与数据](troubleshooting/storage.md) | Origin 改变、浏览器清理、格式不受支持 |
| 页面空白、资源 404 | [部署手册](DEPLOYMENT.md#部署故障快速定位) | 子路径 base 配置错误、部署尚未完成 |

## 可以安全尝试的操作

- 关闭详情面板后重新打开一个项目；
- 取消当前未提交的 AI 任务并保留已写入分类；
- 重新连接 AI 服务，但不要立即保存未知自定义地址；
- 重新同步 GitHub Stars；
- 在无痕窗口打开生产站点判断是否为本地数据问题；
- 对分类迁移使用内置快照撤销；
- 查看 `deployment-info.json` 判断生产版本。

## 不要这样处理

- 不要在没有备份时删除 IndexedDB 或浏览器站点数据；
- 不要运行来源不明的 Console 修复脚本；
- 不要把 GitHub token、AI Key、OAuth code 或备份文件上传到公开 Issue；
- 不要通过关闭 CORS、PKCE、state 或 CSP 绕过登录问题；
- 不要手工编辑 `repoTags` 关系来处理分类合并；
- 不要把 AI JSON 自动修补后直接写入数据库。

## 报告问题需要的信息

```text
StarHub 地址与 deployment-info.json commit：
浏览器与版本：
操作系统：
问题发生前的操作：
期望结果：
实际结果：
是否可稳定复现：
仓库数量级：
AI 供应商/模型（不要提供 Key）：
任务状态与成功/失败数量：
Console/Network 错误（敏感值已遮盖）：
```

公开报告：<https://github.com/hujinghaoabcd/StarHub/issues>。
