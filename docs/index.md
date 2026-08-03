---
layout: home

hero:
  name: StarHub
  text: 管理大量 GitHub Stars
  tagline: 本地优先的分类治理、重点项目、AI 审核分类、README 预览和批量管理
  image:
    src: /logo.svg
    alt: StarHub
  actions:
    - theme: brand
      text: 开始使用
      link: /guide/basic
    - theme: alt
      text: 部署 StarHub
      link: /DEPLOYMENT
    - theme: alt
      text: 查看源码
      link: https://github.com/hujinghaoabcd/StarHub

features:
  - icon: 🔄
    title: 可靠同步
    details: 完整获取 GitHub Stars 后原子替换本地快照；部分失败、超时或取消不会破坏旧数据。
  - icon: 🧭
    title: 分类治理
    details: 正式注册表、迁移预览、安全重命名、关系保留合并、快照和撤销。
  - icon: 🔖
    title: 重点项目
    details: 独立于分类的一键标记、批量操作、筛选、排序和备份。
  - icon: 🤖
    title: AI 审核分类
    details: 元数据初筛、严格 ID 校验、人工审核、分段任务、失败重试和疑难项 README 增强。
  - icon: 📖
    title: 安全 README 预览
    details: Web Worker 渲染、陈旧响应防护、DOMPurify 清理和超大内容限制。
  - icon: 💾
    title: 本地优先
    details: IndexedDB v8 保存仓库、分类、任务和重点标记；Token 与 AI Key 使用会话级存储。
---

## 推荐阅读顺序

1. [基础使用](/guide/basic)：登录、同步、筛选、详情、重点和批量操作；
2. [分类与正式注册表](/guide/tags)：普通分类、注册表、迁移和撤销；
3. [AI 智能分类](/guide/ai-classification)：任务、审核、README 增强和写入边界；
4. [数据管理](/config/data)：IndexedDB、备份、恢复和隐私边界；
5. [部署指南](/DEPLOYMENT)：GitHub Pages 与 Cloudflare OAuth 后端；
6. [项目状态](/development/PROJECT_STATUS)：已完成、未完成和下一阶段。

::: info 当前产品边界
StarHub 不内置某一位用户的个人分类体系，也不集中保存用户的分类库。正式分类注册表由每位用户自行创建、导入和确认。
:::

::: warning AI 功能
AI 分类是辅助功能。模型结果先保存为本地草稿，只有人工确认后才写入正式分类；置信度不是准确率。
:::

## 当前生产地址

- 应用：https://hujinghaoabcd.github.io/StarHub/
- 文档：https://hujinghaoabcd.github.io/StarHub/docs/
- OAuth API：https://starhub-oauth.pages.dev/api
- 健康检查：https://starhub-oauth.pages.dev/api/health

> **截图待补：首页全景**
> 建议使用 1600×900 截图，同时展示分类栏、仓库列表、排序分页、重点筛选和详情摘要卡片。

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #3b82f6 30%, #60a5fa);
}
</style>
