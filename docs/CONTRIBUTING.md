# 贡献指南

感谢你对 StarHub 项目的关注！我们欢迎任何形式的贡献。

## 🤝 如何贡献

### 报告 Bug

1. 搜索 [Issues](https://github.com/hujinghaoabcd/StarHub/issues) 确认没有重复
2. 创建新 Issue，使用 Bug 报告模板
3. 提供详细的复现步骤

### 提出建议

1. 创建 Feature Request Issue
2. 描述使用场景和预期效果
3. 如有可能，提供实现思路

### 提交代码

1. Fork 仓库
2. 创建分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'feat: add feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 创建 Pull Request

---

## 💻 开发环境

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/hujinghaoabcd/StarHub.git
cd starhub

# 安装依赖
npm install

# 启动 OAuth 服务器
node server/dev-server.js

# 启动开发服务器（另一个终端）
npm run dev
```

### 代码检查

```bash
# 运行 ESLint
npm run lint

# 类型检查
npm run type-check
```

---

## 📝 代码规范

### Vue 组件

```vue
<template>
  <div class="component-name">
    <!-- 内容 -->
  </div>
</template>

<script setup lang="ts">
// 1. 导入
import { ref, computed } from 'vue'

// 2. Props/Emits
const props = defineProps<{ title: string }>()
const emit = defineEmits<{ (e: 'update'): void }>()

// 3. 响应式状态
const count = ref(0)

// 4. 计算属性
const doubled = computed(() => count.value * 2)

// 5. 方法
function handleClick() {
  emit('update')
}
</script>

<style lang="scss" scoped>
.component-name {
  // 样式
}
</style>
```

### 提交信息

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>
```

类型：
- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档更新
- `style` - 代码格式
- `refactor` - 重构
- `perf` - 性能优化
- `test` - 测试
- `chore` - 构建/工具

示例：
```
feat(tag): add batch operation
fix(sync): resolve duplicate issue
docs: update deployment guide
```

---

## 📁 项目结构

```
src/
├── api/          # API 服务
├── components/   # 公共组件
├── config/       # 配置文件
├── db/           # 数据库
├── i18n/         # 国际化
├── layouts/      # 布局组件
├── pages/        # 页面组件
├── router/       # 路由
├── services/     # 业务服务
├── stores/       # 状态管理
├── styles/       # 全局样式
├── types/        # 类型定义
└── utils/        # 工具函数
```

---

## 🌍 国际化

添加新文本时，请同时更新中英文：

```typescript
// src/i18n/locales/zh.ts
export default {
  newKey: '新文本'
}

// src/i18n/locales/en.ts
export default {
  newKey: 'New Text'
}
```

---

## 📚 相关资源

- [Vue 3 文档](https://vuejs.org/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Element Plus 文档](https://element-plus.org/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [Dexie.js 文档](https://dexie.org/)

---

再次感谢你的贡献！🎉

