# 故障排除指南

本文档汇总了 StarHub 使用过程中可能遇到的问题和解决方案。

## 目录

- [登录问题](#登录问题)
- [同步问题](#同步问题)
- [存储问题](#存储问题)
- [AI 分类问题](#ai-分类问题)
- [界面问题](#界面问题)
- [紧急修复脚本](#紧急修复脚本)

---

## 登录问题

### OAuth 登录失败

**症状：** 点击登录按钮后跳转 GitHub，但返回后显示错误。

**解决方案：**

1. **检查回调地址**
   - 确认 GitHub OAuth App 的回调地址与当前网址匹配
   - 本地开发：`http://localhost:5173/`
   - 生产环境：`https://yourdomain.com/`

2. **检查 Client ID**
   - 确认 `src/config/oauth.ts` 中的 CLIENT_ID 正确

3. **本地开发检查后端服务**
   ```bash
   # 确认后端服务正在运行
   npm run cloudflare:dev
   ```

4. **检查 .env 配置**
   ```env
   CLIENT_ID=your_client_id
   CLIENT_SECRET=your_client_secret
   ```

### 登录后一直加载

**症状：** 登录成功但页面一直显示加载状态。

**解决方案：**

1. 清除浏览器缓存和 localStorage
2. 检查浏览器控制台是否有错误
3. 尝试清空数据后重新登录

---

## 同步问题

### 同步卡住不动

**症状：** 同步进度条不动或显示 "正在同步..."。

**解决方案：**

1. **检查网络连接**
   - 确认可以正常访问 GitHub

2. **刷新页面重试**
   ```bash
   # 按 F5 刷新页面
   ```

3. **使用"重新抓取"功能**
   - 点击右上角用户头像 → 选择"重新抓取"

### 同步后数据不完整

**症状：** 显示的仓库数量少于实际 Star 数量。

**解决方案：**

1. **等待同步完成**
   - GitHub API 有速率限制，大量数据需要时间

2. **检查 API 速率限制**
   - 打开控制台查看是否有 403 错误
   - 等待一段时间后重试

3. **重新同步**
   - 使用"重新抓取"功能

---

## 存储问题

### QuotaExceededError（存储空间不足）

**症状：** 控制台显示 `QuotaExceededError` 错误。

**快速修复：**

```javascript
// 在浏览器控制台运行
fetch('/fix-quota-error.js').then(r => r.text()).then(eval);
```

**手动修复：**

1. 打开开发者工具 (F12)
2. 进入 **Application** > **Storage** > **IndexedDB**
3. 右键删除 `StarHubDB`
4. 刷新页面

### DatabaseClosedError（数据库已关闭）

**症状：** 控制台显示 `DatabaseClosedError` 错误。

**解决方案：**

1. 刷新页面
2. 如果问题持续，运行：

```javascript
// 删除数据库
indexedDB.deleteDatabase('StarHubDB');
location.reload();
```

### 清空数据后仍有遗留

**症状：** 点击"清空所有数据"后，左侧分类仍显示有数字。

**快速修复：**

```javascript
// 在浏览器控制台运行
fetch('/force-clear-tags.js').then(r => r.text()).then(eval);
```

**完整清理：**

```javascript
// 彻底清空所有数据
(async function() {
  const openReq = indexedDB.open('StarHubDB');
  openReq.onsuccess = async (e) => {
    const db = e.target.result;
    const tx = db.transaction(['repos', 'tags', 'repoTags'], 'readwrite');
    await tx.objectStore('repos').clear();
    await tx.objectStore('tags').clear();
    if (db.objectStoreNames.contains('repoTags')) {
      await tx.objectStore('repoTags').clear();
    }
    db.close();
    await indexedDB.deleteDatabase('StarHubDB');
    localStorage.clear();
    location.reload();
  };
})();
```

---

## AI 分类问题

### AI 分类失败

**症状：** 点击 AI 分类后显示错误。

**解决方案：**

1. **检查 API Key**
   - 确认 API Key 配置正确
   - 确认账户有余额

2. **检查网络**
   - 确认可以访问 AI 服务的 API 地址

3. **减小批次大小**
   - 在设置中将批次大小调小（如 10 或 20）

### 分类不准确

**症状：** AI 分类结果与预期不符。

**解决方案：**

1. **开启读取 README**
   - 在设置中开启"读取 README"选项

2. **使用更强的模型**
   - 尝试 gpt-4o 或 claude-3-5-sonnet

3. **减小批次大小**
   - 小批次通常分类更准确

### Token 消耗过多

**症状：** AI 服务费用超出预期。

**解决方案：**

1. 关闭"读取 README"选项
2. 使用更经济的模型（如 gpt-4o-mini）
3. 只对未分类的仓库进行分类

---

## 界面问题


### 页面显示空白

**症状：** 页面加载后显示空白。

**解决方案：**

1. 检查浏览器控制台错误
2. 清除浏览器缓存
3. 尝试使用无痕模式访问

### 滚动不流畅

**症状：** 仓库列表滚动卡顿。

**解决方案：**

1. 检查仓库数量是否过多
2. 尝试使用 Chrome 或 Edge 浏览器
3. 关闭其他占用资源的程序

---

## 紧急修复脚本

### fix-quota-error.js

修复存储空间不足问题：

```javascript
// 复制到控制台运行
fetch('/fix-quota-error.js').then(r => r.text()).then(eval);
```

### force-clear-tags.js

强制清空所有标签关联：

```javascript
// 复制到控制台运行
fetch('/force-clear-tags.js').then(r => r.text()).then(eval);
```

### emergency-clear.js

紧急清空所有数据：

```javascript
// 复制到控制台运行
fetch('/emergency-clear.js').then(r => r.text()).then(eval);
```

---

## 获取帮助

如果以上方案都无法解决问题：

1. **检查控制台日志**
   - 按 F12 打开开发者工具
   - 切换到 Console 标签
   - 复制错误信息

2. **提交 Issue**
   - 访问 [GitHub Issues](https://github.com/mengjian-github/starhub/issues)
   - 描述问题和复现步骤
   - 附上控制台错误信息
   - 提供浏览器和操作系统信息

3. **提供信息**
   - 操作系统版本
   - 浏览器及版本
   - 问题的具体表现
   - 复现步骤

