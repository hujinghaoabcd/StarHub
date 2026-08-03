# AI 服务配置

AI 配置位于右上角用户菜单的“设置”。StarHub 直接从浏览器调用用户选择的服务商，不提供集中 AI 账户或共享额度。

## 配置字段

| 字段 | 是否敏感 | 存储 | 说明 |
|---|---|---|---|
| 服务商 | 否 | `localStorage` | OpenAI、Claude、DeepSeek、Qwen、智谱 |
| API Key | 是 | `sessionStorage` | 标签页/浏览会话结束时失效，可一键清除；无独立计时 TTL |
| API 地址 | 否 | `localStorage` | 留空使用内置默认地址 |
| 模型 ID | 否 | `localStorage` | 留空使用代码中的默认模型 |
| 批次大小 | 否 | `localStorage` | 1–100，默认 50 |

旧版本若曾把 API Key 写入长期存储，当前版本会一次性迁移到会话存储并擦除持久副本。

## 当前内置默认值

| 服务商 | 默认 API 地址 | 默认模型 ID |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Anthropic | `https://api.anthropic.com/v1` | `claude-sonnet-4-6` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| 智谱 AI | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |

这些是当前代码默认值，不代表长期最新或最优模型。供应商停用模型后，应填写新的模型 ID并先执行连接测试。

## 获取 API Key

- OpenAI：https://platform.openai.com/api-keys
- Anthropic：https://console.anthropic.com/settings/keys
- DeepSeek：https://platform.deepseek.com/api_keys
- 通义千问：https://dashscope.aliyun.com/
- 智谱 AI：https://open.bigmodel.cn/

请为 Key 设置最低必要额度和使用限制。不要使用主账户中权限过大的长期密钥。

## 保存配置

1. 选择服务商；
2. 粘贴 API Key；
3. 通常保持 API 地址为空；
4. 需要新模型时填写精确模型 ID；
5. 选择批次大小；
6. 点击“测试连接”；
7. 核对目标主机；
8. 测试成功后保存。

> **截图待补：AI 设置完整表单**
> 显示服务商、遮蔽后的 Key、默认地址提示、自定义模型、批次大小、连接测试和清除 Key 按钮。

## 自定义 API 地址安全规则

自定义地址必须满足：

- 使用 `https:`；
- 不包含用户名或密码；
- 不包含 query 或 hash；
- 不是 `localhost`、`.localhost`、回环地址或私有 IPv4；
- 不是本地 IPv6、ULA 或 link-local 地址；
- 保存或测试前显示最终主机名，由用户确认。

这些限制用于降低 API Key 被误发到错误服务器或本地恶意服务的风险。

::: danger
自定义兼容 API 会收到你的 Key、仓库元数据、正式分类注册表，以及疑难项的 README 摘要。只有在你信任该主机时才确认。
:::

## 连接测试

连接测试发送一个极小请求，并设置超时和 `AbortController`。离开设置页时会取消仍在运行的测试。

测试失败常见原因：

- Key 复制不完整或过期；
- 模型 ID 不存在或账号无权限；
- 服务商余额不足；
- 浏览器所在网络无法访问 API；
- 服务商未允许浏览器 CORS；
- 兼容代理不支持请求字段；
- API 地址多写或少写 `/v1`。

测试连接只说明最小请求可用，不保证大批次分类一定成功。

## 批次大小

| 大小 | 建议场景 | 风险 |
|---|---|---|
| 10–20 | 新模型、新注册表、排查 JSON 错误 | 请求次数更多 |
| 30–50 | 一般使用，默认 50 | 准确率和速度较平衡 |
| 51–100 | 模型输出稳定且类别较少 | 更容易截断、遗漏或触发限制 |

批次大小不等于大任务分段大小。批次控制单次 AI 请求；分段控制一次进入审核表和提交的数据量。

## 结构化输出差异

- OpenAI 与 Claude 路径使用严格 JSON Schema；
- OpenAI 兼容路径根据供应商能力使用 `json_schema` 或 `json_object`；
- OpenAI/Qwen 使用 `max_completion_tokens`；其他兼容服务使用 `max_tokens`；
- 特定 DeepSeek v4 模型会显式关闭 thinking，避免只有 reasoning 而没有最终 JSON；
- 所有供应商返回都经过同一仓库与分类白名单校验。

## 数据发送范围

元数据初筛发送：仓库名称、描述、主语言、Topics 和当前正式注册表。README 只在疑难项增强时发送经过清理和截断的摘要。

StarHub 不会把 API Key 写入备份，也不会把分类请求通过 OAuth 后端中转。

## 清除与失效

- 点击“清除 API Key”立即删除会话 Key；
- 关闭标签页或会话结束后 Key 失效；
- 清空 IndexedDB 不一定清除 `sessionStorage`，敏感设备上应同时退出登录并清除 Key；
- 轮换 Key 后应重新测试连接。

## 常见错误

### 地址格式无效

恢复为空以使用官方默认地址，或输入完整公开 HTTPS URL。

### 401/403

检查 Key、模型权限、账户组织和服务商区域策略。

### 404

通常是 API 路径或模型 ID 错误。OpenAI 兼容接口通常需要 `/v1`，但以服务商文档为准。

### 429

等待限流恢复，减小批次，并只重试失败项。不要反复创建新任务。

### JSON 截断或未知分类 ID

减小批次，确认模型支持结构化输出，并检查任务注册表版本。StarHub 会拒绝这类结果，不会自动补 JSON。

## 下一步

- [AI 智能分类](../guide/ai-classification.md)
- [分类与正式注册表](../guide/tags.md)
- [AI 故障排查](../TROUBLESHOOTING.md)
