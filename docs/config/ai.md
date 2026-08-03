# AI 服务配置

本节详细介绍各 AI 服务的配置方法。

## 配置入口

1. 点击右上角用户头像
2. 选择 **设置**
3. 找到 **AI 分类设置** 区域

## OpenAI

### 获取 API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 登录或注册账户
3. 进入 **API Keys** 页面
4. 点击 **Create new secret key**
5. 复制生成的 API Key

### 推荐模型

| 模型 | 说明 | 输入价格 | 输出价格 |
|------|------|----------|----------|
| gpt-4o-mini | **推荐** | $0.15/1M | $0.60/1M |
| gpt-4o | 最强 | $5/1M | $15/1M |
| gpt-3.5-turbo | 经济 | $0.50/1M | $1.50/1M |

### 配置示例

```
服务商：OpenAI
API Key：sk-xxxxxxxxxxxxxxxxxxxx
API 地址：（留空使用默认）
模型：gpt-4o-mini
```

### 使用代理

如果需要代理：

```
API 地址：https://your-proxy.com/v1
```

---

## Claude (Anthropic)

### 获取 API Key

1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 登录或注册
3. 进入 **API Keys**
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
API 地址：（留空使用默认）
模型：claude-sonnet-4-6
```

---

## DeepSeek

国产 AI 模型，高性价比。

### 获取 API Key

1. 访问 [DeepSeek 平台](https://platform.deepseek.com/)
2. 注册并登录
3. 进入 **API Keys**
4. 创建 API Key

### 推荐模型

| 模型 | 说明 | 价格 |
|------|------|------|
| deepseek-chat | 通用 | ¥1/1M |
| deepseek-coder | 代码 | ¥1/1M |

### 配置示例

```
服务商：DeepSeek
API Key：sk-xxxxxxxxxxxxxxxxxxxx
API 地址：（留空使用默认）
模型：deepseek-chat
```

---

## 通义千问

阿里云 AI 服务，中文支持好。

### 获取 API Key

1. 访问 [阿里云 DashScope](https://dashscope.aliyun.com/)
2. 开通服务
3. 获取 API Key

### 推荐模型

| 模型 | 说明 | 价格 |
|------|------|------|
| qwen-plus | **推荐** | ¥0.008/千Token |
| qwen-turbo | 快速 | ¥0.002/千Token |
| qwen-max | 最强 | ¥0.12/千Token |

### 配置示例

```
服务商：通义千问
API Key：sk-xxxxxxxxxxxxxxxxxxxx
API 地址：（留空使用默认）
模型：qwen-plus
```

---

## 智谱 AI

提供免费额度，适合个人使用。

### 获取 API Key

1. 访问 [智谱 AI 开放平台](https://open.bigmodel.cn/)
2. 注册并登录
3. 进入个人中心获取 API Key

### 推荐模型

| 模型 | 说明 | 价格 |
|------|------|------|
| glm-4-flash | **推荐** | 免费 |
| glm-4 | 能力强 | ¥0.1/千Token |
| glm-4-plus | 最强 | ¥0.05/千Token |

### 配置示例

```
服务商：智谱 AI
API Key：xxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxx
API 地址：（留空使用默认）
模型：glm-4-flash
```

---

## 高级设置

### 批次大小

每次 AI 请求处理的仓库数量：

| 值 | 说明 |
|-----|------|
| 10 | 准确，适合测试 |
| 30 | 均衡 |
| 50 | **默认** |
| 100 | 快速，可能影响准确性 |

### 读取 README

| 选项 | 说明 |
|------|------|
| 开启 | 更准确，消耗更多 Token |
| 关闭 | 更快，更经济 |

---

## 安全提示

> ⚠️ **注意**
> - API Key 只存储在当前浏览器会话的 sessionStorage，关闭页面后失效
> - 自定义 API 地址必须使用 HTTPS，并在保存前核对目标主机
> - 不要在公共电脑配置 API Key
> - 定期轮换 API Key
> - 建议设置 API 使用限额

## 常见问题

### API Key 无效？

1. 检查是否完整复制（无多余空格）
2. 确认未过期或被禁用
3. 检查账户余额

### 连接超时？

1. 检查网络连接
2. 尝试使用代理
3. 确认 API 地址正确

### 分类不准确？

1. 开启"读取 README"
2. 减小批次大小
3. 尝试更强的模型
