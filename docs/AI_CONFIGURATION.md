# AI 分类配置指南

StarHub 支持多种 AI 服务来自动分类你的 GitHub Star 仓库。本文档详细介绍各服务的配置方法。

## 目录

- [支持的 AI 服务](#支持的-ai-服务)
- [OpenAI 配置](#openai-配置)
- [Claude 配置](#claude-配置)
- [DeepSeek 配置](#deepseek-配置)
- [通义千问配置](#通义千问配置)
- [智谱 AI 配置](#智谱-ai-配置)
- [高级配置](#高级配置)
- [常见问题](#常见问题)

---

## 支持的 AI 服务

| 服务商 | 默认模型 | API 地址 | 推荐场景 |
|--------|----------|----------|----------|
| OpenAI | gpt-4o-mini | api.openai.com | 最高准确率 |
| Claude | claude-sonnet-4-6 | api.anthropic.com | 结构化输出与复杂理解 |
| DeepSeek | deepseek-chat | api.deepseek.com | 高性价比 |
| 通义千问 | qwen-plus | dashscope.aliyuncs.com | 中文友好 |
| 智谱 AI | glm-4-flash | open.bigmodel.cn | 免费额度 |

---

## OpenAI 配置

### 获取 API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 登录或注册账户
3. 进入 **API Keys** 页面
4. 点击 **Create new secret key**
5. 复制生成的 API Key

### 推荐模型

| 模型 | 说明 | 价格（每百万 Token）|
|------|------|---------------------|
| gpt-4o-mini | **推荐**，快速且便宜 | $0.15 / $0.60 |
| gpt-4o | 最强能力 | $5 / $15 |
| gpt-3.5-turbo | 经济选择 | $0.50 / $1.50 |

### 配置示例

```
服务商：OpenAI
API Key：sk-xxxxxxxxxxxxxxxxxxxx
API 地址：https://api.openai.com/v1（默认，可不填）
模型：gpt-4o-mini（默认）
```

### 使用代理

如果需要使用代理或第三方 API 服务：

```
API 地址：https://your-proxy.com/v1
```

---

## Claude 配置

### 获取 API Key

1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 登录或注册账户
3. 进入 **API Keys** 页面
4. 创建新的 API Key

### 推荐模型

| 模型 | 说明 |
|------|------|
| claude-sonnet-4-6 | **默认**，支持原生 JSON Schema 结构化输出 |

模型可用性和价格会变化，请以 Claude Platform 当前文档为准。

### 配置示例

```
服务商：Claude
API Key：sk-ant-xxxxxxxxxxxxxxxxxxxx
API 地址：https://api.anthropic.com/v1（默认）
模型：claude-sonnet-4-6（默认）
```

---

## DeepSeek 配置

DeepSeek 是国产 AI 模型，提供高性价比的服务。

### 获取 API Key

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册并登录
3. 进入 **API Keys** 页面
4. 创建 API Key

### 推荐模型

| 模型 | 说明 | 价格 |
|------|------|------|
| deepseek-chat | 通用对话 | ¥1/百万 Token |
| deepseek-coder | 代码理解 | ¥1/百万 Token |

### 配置示例

```
服务商：DeepSeek
API Key：sk-xxxxxxxxxxxxxxxxxxxx
API 地址：https://api.deepseek.com/v1（默认）
模型：deepseek-chat（默认）
```

---

## 通义千问配置

阿里云通义千问，对中文支持友好。

### 获取 API Key

1. 访问 [阿里云 DashScope](https://dashscope.aliyun.com/)
2. 开通服务并获取 API Key
3. 在控制台中创建 API Key

### 推荐模型

| 模型 | 说明 | 价格 |
|------|------|------|
| qwen-plus | **推荐**，综合能力强 | ¥0.008/千 Token |
| qwen-turbo | 快速响应 | ¥0.002/千 Token |
| qwen-max | 最强能力 | ¥0.12/千 Token |

### 配置示例

```
服务商：通义千问
API Key：sk-xxxxxxxxxxxxxxxxxxxx
API 地址：https://dashscope.aliyuncs.com/compatible-mode/v1（默认）
模型：qwen-plus（默认）
```

---

## 智谱 AI 配置

智谱 AI 提供免费额度，适合试用。

### 获取 API Key

1. 访问 [智谱 AI 开放平台](https://open.bigmodel.cn/)
2. 注册并登录
3. 进入个人中心获取 API Key

### 推荐模型

| 模型 | 说明 | 价格 |
|------|------|------|
| glm-4-flash | **推荐**，免费额度 | 免费 |
| glm-4 | 强大能力 | ¥0.1/千 Token |
| glm-4-plus | 最强能力 | ¥0.05/千 Token |

### 配置示例

```
服务商：智谱 AI
API Key：xxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxx
API 地址：https://open.bigmodel.cn/api/paas/v4（默认）
模型：glm-4-flash（默认）
```

---

## 高级配置

### 批次大小

控制每次 AI 请求处理的仓库数量：

| 设置 | 说明 |
|------|------|
| 10 | 小批量，适合测试 |
| 30 | 中等批量 |
| 50 | **默认**，平衡效率和准确性 |
| 100 | 大批量，速度更快但可能影响准确性 |

### 读取 README

开启后，AI 会读取仓库的 README 内容进行分类：

- ✅ **开启**：分类更准确，但会消耗更多 Token
- ❌ **关闭**：仅使用仓库名称和描述，速度更快

### 分类模式

当前只处理没有分类的仓库。模型只能返回已有分类的稳定 ID，结果在审核并确认后写入，不会清空或覆盖已有分类。

---

## 常见问题

### Q: API Key 无效？

1. 检查 API Key 是否正确复制（无多余空格）
2. 确认 API Key 未过期或被禁用
3. 检查账户余额是否充足

### Q: 分类失败？

1. 检查网络连接
2. 尝试减小批次大小
3. 查看浏览器控制台错误信息

### Q: 分类不准确？

1. 开启"读取 README"选项
2. 尝试更强大的模型（如 gpt-4o）
3. 减小批次大小

### Q: Token 消耗太多？

1. 关闭"读取 README"选项
2. 使用更经济的模型
3. 减少需要分类的仓库数量

### Q: 速度太慢？

1. 增加批次大小
2. 使用更快的模型（如 gpt-4o-mini）
3. 关闭"读取 README"选项

---

## 费用估算

以 1000 个仓库为例（不读取 README）：

| 服务 | 模型 | 预估费用 |
|------|------|----------|
| OpenAI | gpt-4o-mini | ~$0.05 |
| DeepSeek | deepseek-chat | ~¥0.3 |
| 通义千问 | qwen-plus | ~¥0.5 |
| 智谱 | glm-4-flash | 免费 |

*注：实际费用取决于仓库描述长度和分类复杂度*

---

## 安全提示

⚠️ API Key 仅存储在浏览器 localStorage 中，不会上传到服务器。但仍需注意：

1. 不要在公共电脑上配置 API Key
2. 定期轮换 API Key
3. 设置 API 使用限额
