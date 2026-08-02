# StarHub 项目更新状态

## 当前概况

- 阶段：第一阶段——稳定性与部署基础已完成
- 基准分支：`main`
- GitHub Pages：已启用并成功发布
- 生产发布：仅 `main`
- 应用与文档由 GitHub Actions 自动构建、发布和验证

## 已完成

### 批次 1：工程与 CI 基线

- [x] Node.js 22、ESLint、类型检查和 CI 基线
- [x] 非破坏性 Lint、`lint:fix`、`check` 与 `server:dev`
- [x] 修复本地 OAuth 服务入口
- [x] CI、Lint、类型检查和应用/文档联合构建通过

### 批次 2：应用与文档同域部署

- [x] 应用基础路径 `/StarHub/`
- [x] 文档基础路径 `/StarHub/docs/`
- [x] 应用与文档联合构建到 `dist/`
- [x] 生成 `.nojekyll`
- [x] 生成带构建 SHA 的 `deployment-info.json`
- [x] GitHub Pages 配置确认：`build_type: workflow`
- [x] 生产部署限制为 `main`
- [x] Pages 构建、artifact 上传和生产部署成功
- [x] 公网冒烟测试通过
- [x] 应用首页、文档首页、部署 SHA、基础路径和代表性静态资源均通过验证
- [x] 临时诊断工作流未进入最终 `main`

## 在线地址

- 应用：`https://hujinghaoabcd.github.io/StarHub/`
- 文档：`https://hujinghaoabcd.github.io/StarHub/docs/`

## 首次完整生产验证

```text
main CI run                   30747981390  PASS
main Pages deployment run     30747981393  PASS
application page              PASS
VitePress documentation       PASS
deployment-info.json          PASS
verified application commit   b406ede95eb3666bcf33d4b82bca576e112469f5
application asset             /StarHub/assets/index-D_FEoJXh.js
VitePress asset               /StarHub/docs/assets/style.9lQW86My.css
```

最新在线提交以站点中的 `deployment-info.json` 为准；每次 `main` 发布后的自动冒烟测试都会验证其 SHA 与当前构建一致。

## 未完成

### P0：仓库同步正确性

- [ ] 修复取消 Star 后本地仍保留旧仓库的问题
- [ ] 提取可测试的同步结果合并函数
- [ ] 区分完整成功、部分成功和失败
- [ ] 远程分页全部成功后再原子更新 IndexedDB
- [ ] 增加同步单元测试

### P0：OAuth 安全与生产后端

- [ ] 增加 OAuth `state` 生成、保存与校验
- [ ] 回调改为 `postMessage` 并校验来源
- [ ] token 交换改用 POST 请求体
- [ ] 移除无实际认证作用的随机 `appToken`
- [ ] 设计 GitHub Token 安全存储方案
- [ ] 部署 Cloudflare Worker OAuth 后端
- [ ] 配置生产 OAuth App 首页和回调地址
- [ ] 完成在线 GitHub 登录测试

### P1：依赖、数据与测试

- [ ] 审查 33 个依赖漏洞：2 low、12 moderate、19 high
- [ ] 统一 `tags.repos` 与 `repoTags` 双轨标签模型
- [ ] 清理 9 条 ESLint 警告
- [ ] 处理两个超过 1 MB 的主要 chunk
- [ ] 处理 VitePress 高亮和 CSS nesting 警告
- [ ] 增加 Vitest、Vue Test Utils 和 Playwright

## 下一步

1. 进入仓库同步正确性批次；
2. 修复幽灵仓库和部分失败状态；
3. 增加同步测试；
4. 随后进行 OAuth 安全重构和 Worker 部署。

## 更新规则

每一批必须记录：已完成、未完成、修改文件、验证结果、已知风险和下一步。


## OAuth 后端批次（代码准备完成，等待平台配置）

### 已完成

- [x] OAuth 回调改为应用根路径，不再使用 URL fragment
- [x] 增加随机 state 校验
- [x] 增加 PKCE S256
- [x] token 交换改为 JSON POST
- [x] Cloudflare Function 使用 POST 请求体调用 GitHub
- [x] 增加严格 CORS、Origin 白名单和 redirect URI 校验
- [x] 增加 `/api/health`
- [x] 增加独立 Cloudflare 构建与类型检查
- [x] 移除随机 appToken，登录状态以 GitHub token 为准

### 等待用户完成

- [ ] 在 Cloudflare Pages 连接 StarHub 仓库
- [ ] 添加 CLIENT_SECRET 等 Production Variables and Secrets
- [ ] 将 GitHub OAuth App 回调改为 `https://hujinghaoabcd.github.io/StarHub/`
- [ ] 将 Cloudflare API 地址写入 GitHub Actions 变量 `VITE_API_BASE_URL`
- [ ] 重新部署并完成真实 GitHub 登录验证
