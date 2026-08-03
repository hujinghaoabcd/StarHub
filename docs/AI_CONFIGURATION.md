# AI 配置文档入口

本文件保留用于兼容仓库中的旧链接。当前 AI 文档已经拆分为：

- [AI 服务配置](config/ai.md)：服务商、模型、API 地址、Key、安全校验和连接测试；
- [AI 智能分类](guide/ai-classification.md)：任务创建、分段执行、人工审核、README 增强、写入和撤销；
- [AI 分类审计](development/AI_CLASSIFICATION_AUDIT.md)：历史问题、已实施修复和剩余技术债；
- [数据管理](config/data.md)：任务表、README 缓存、备份范围和已知清理限制。

## 快速配置

1. 打开设置；
2. 选择服务商；
3. 输入 API Key；
4. 通常保持 API 地址为空；
5. 需要时填写精确模型 ID；
6. 先测试连接；
7. 核对目标主机后保存。

API Key 只保存在当前页面会话的 `sessionStorage`，不会进入 StarHub 备份。

::: warning
旧版本文档中的模型价格、长期 `localStorage` Key、全量 README 开关和“AI 自动创建分类”等描述均已过时，请以上述分拆文档为准。
:::
