# 主题与语言

StarHub 支持深色/浅色主题和中文/英文界面。偏好保存在 `localStorage`，不包含敏感信息。

## 主题

### 切换

点击顶部主题按钮在 `dark` 与 `light` 间切换。默认主题为深色；保存键为 `app-theme`。

切换时同时更新：

- Pinia theme state；
- `<html data-theme>`；
- `<body data-theme>`；
- `dark` class；
- 浏览器 `theme-color` meta。

当前没有独立的“跟随系统”第三种状态。README 或旧文档中若写“自动跟随系统”，应视为过时描述。

### 样式变量

主要变量位于 `src/styles/variables.scss` 和 `src/styles/main.scss`，包括背景、文字、边框、强调色、阴影和过渡。

新增组件时应：

1. 优先使用 CSS 变量，不硬编码主题色；
2. 同时检查浅色和深色；
3. 检查 hover、focus、disabled、selected；
4. 确保选中控件的文字与背景有足够对比；
5. 不在全局 SCSS 中使用 Vue SFC 的 `:deep()`。

> **截图待补：双主题对比**
> 同一仓库和同一分类任务各截一张，特别检查分页选中态、警告按钮和表格边框。

## 语言

### 切换

顶部 `中 / EN` 控件切换 `zh` 和 `en`。保存键为 `app-language` 与兼容键 `app-locale`。

初始化顺序：

1. 读取 `app-locale`；
2. 读取 `app-language`；
3. 使用浏览器语言；
4. 非中文回退为英文。

Vue I18n 的 fallback locale 为英文。

### 翻译文件

- `src/i18n/locales/zh.ts`
- `src/i18n/locales/en.ts`

新增界面功能必须同步增加两种语言，并在组件中使用 `t()`。不要通过 CSS 或字符串判断当前语言。

### 当前国际化状态

登录、设置、分类治理、AI 任务和主界面语言包已经双语。2026-08-04 的静态校验确认中英文语言包均有 482 个叶子 key，集合完全一致。仓库自身内容、AI 原始理由和供应商错误可能保持源语言；少量运行时兜底文本仍需通过人工浏览审计。

## 文档语言

VitePress 当前主要维护中文详细文档；仓库根目录提供完整中文 README 和英文 README。新增重要用户功能至少需要：

- 中文详细指南；
- 英文 README 功能摘要；
- 中英文 UI 文案；
- 更新日志和交接说明。

## 常见问题

### 切换后没有变化

刷新页面，检查浏览器是否禁止 `localStorage`，并查看 Console 是否有 i18n key 缺失。

### 局部文字仍是中文

这通常是历史硬编码，不是缓存问题。请提交包含页面位置、语言状态和截图的 Issue。

### 深色主题控件看不清

记录控件的正常、hover、focus、selected 和 disabled 状态；主题问题应同时提供两套截图。

### 清除站点数据后主题重置

这是预期行为。主题和语言属于站点本地偏好，不进入备份 v4。
