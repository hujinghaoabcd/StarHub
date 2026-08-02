# 贡献指南

感谢你对 StarHub 项目的关注！我们欢迎任何形式的贡献，包括但不限于：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📖 改进文档
- 🔧 提交代码修复
- ✨ 开发新功能

## 📋 行为准则

请保持友善和尊重。我们致力于营造一个开放、包容的社区环境。

## 🚀 快速开始

### 1. Fork 仓库

点击 GitHub 页面右上角的 Fork 按钮。

### 2. 克隆到本地

```bash
git clone hhttps://github.com/hujinghaoabcd/StarHub.git
cd starhub
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置开发环境

参考 [README.md](README.md) 中的 OAuth 配置说明。

### 5. 启动开发服务器

```bash
# 终端 1：启动 OAuth 代理
node server/dev-server.js

# 终端 2：启动前端
npm run dev
```

## 💻 开发规范

### 代码风格

- 使用 **TypeScript** 编写所有代码
- 遵循项目的 **ESLint** 配置
- Vue 组件使用 **组合式 API** (`<script setup>`)
- CSS 使用 **SCSS**，遵循 BEM 命名规范

### 运行代码检查

```bash
# 运行 ESLint
npm run lint

# 类型检查
npm run type-check
```

### 目录结构

```
src/
├── api/          # API 服务层 - GitHub API、认证等
├── components/   # 公共组件 - 可复用组件
├── config/       # 配置文件 - AI、OAuth、分类预设等
├── db/           # 数据库 - IndexedDB 定义
├── i18n/         # 国际化 - 语言包
├── layouts/      # 布局组件 - 页面布局
├── pages/        # 页面组件 - 路由页面
├── router/       # 路由配置
├── services/     # 业务服务 - AI 分类等业务逻辑
├── stores/       # 状态管理 - Pinia stores
├── styles/       # 全局样式 - SCSS 变量、主题
├── types/        # 类型定义 - TypeScript 接口
└── utils/        # 工具函数 - 通用工具
```

### 组件开发规范

```vue
<template>
  <!-- 使用语义化的 class 名称 -->
  <div class="component-name">
    <!-- 内容 -->
  </div>
</template>

<script setup lang="ts">
// 1. 导入语句
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

// 2. Props 定义
interface Props {
  title: string
  count?: number
}
const props = withDefaults(defineProps<Props>(), {
  count: 0
})

// 3. Emits 定义
const emit = defineEmits<{
  (e: 'update', value: number): void
}>()

// 4. 响应式状态
const isLoading = ref(false)

// 5. 计算属性
const displayCount = computed(() => props.count.toLocaleString())

// 6. 方法
function handleClick() {
  emit('update', props.count + 1)
}

// 7. 生命周期钩子
onMounted(() => {
  // 初始化逻辑
})
</script>

<style lang="scss" scoped>
.component-name {
  // 样式
}
</style>
```

### 国际化

添加新的文本时，请同时更新中英文语言包：

```typescript
// src/i18n/locales/zh.ts
export default {
  newFeature: {
    title: '新功能',
    description: '这是新功能的描述'
  }
}

// src/i18n/locales/en.ts
export default {
  newFeature: {
    title: 'New Feature',
    description: 'This is the description of new feature'
  }
}
```

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 代码重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具相关 |

#### 示例

```bash
# 新功能
git commit -m "feat(tag): add batch tag operation"

# Bug 修复
git commit -m "fix(sync): resolve duplicate repos issue"

# 文档更新
git commit -m "docs: update deployment guide"
```

## 🔀 提交 Pull Request

### 1. 创建分支

```bash
# 从 main 分支创建新分支
git checkout -b feature/your-feature main
```

分支命名规范：
- `feature/xxx` - 新功能
- `fix/xxx` - Bug 修复
- `docs/xxx` - 文档更新
- `refactor/xxx` - 代码重构

### 2. 开发和提交

```bash
# 开发完成后
git add .
git commit -m "feat: your feature description"
```

### 3. 推送分支

```bash
git push origin feature/your-feature
```

### 4. 创建 Pull Request

1. 访问你的 Fork 仓库
2. 点击 **Compare & pull request**
3. 填写 PR 描述，说明改动内容
4. 提交 PR

### PR 描述模板

```markdown
## 改动说明

简要描述这个 PR 做了什么。

## 改动类型

- [ ] 新功能
- [ ] Bug 修复
- [ ] 文档更新
- [ ] 代码重构
- [ ] 其他

## 相关 Issue

关联的 Issue 编号（如有）：#xxx

## 测试

描述如何测试这些改动。

## 截图

如有 UI 改动，请附上截图。
```

## 🐛 报告 Bug

请通过 [GitHub Issues](https://github.com/hujinghaoabcd/StarHub/issues) 报告 Bug。

### Bug 报告模板

```markdown
## 问题描述

简要描述遇到的问题。

## 复现步骤

1. 进入 '...'
2. 点击 '...'
3. 滚动到 '...'
4. 看到错误

## 期望行为

描述你期望发生的事情。

## 实际行为

描述实际发生的事情。

## 环境信息

- 操作系统：
- 浏览器及版本：
- Node.js 版本：

## 截图

如有必要，请附上截图。

## 控制台错误

如有控制台错误，请粘贴相关日志。
```

## 💡 功能建议

欢迎通过 [GitHub Issues](https://github.com/hujinghaoabcd/StarHub/issues) 提出功能建议。

### 功能建议模板

```markdown
## 功能描述

简要描述你希望添加的功能。

## 使用场景

描述这个功能的使用场景和解决的问题。

## 可能的实现方案

如果有想法，描述可能的实现方案。

## 附加信息

任何其他相关信息或截图。
```

## 📚 相关资源

- [Vue 3 文档](https://cn.vuejs.org/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Element Plus 文档](https://element-plus.org/zh-CN/)
- [Pinia 文档](https://pinia.vuejs.org/zh/)
- [Dexie.js 文档](https://dexie.org/docs/)

---

再次感谢你的贡献！🎉

