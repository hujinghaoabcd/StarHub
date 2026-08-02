# StarHub 开发交接文档

## 当前状态

- 分支：`agent/foundation-ci-sync`
- 基准：`main`
- PR：#3
- Pages：已启用，`build_type: workflow`
- 生产策略：PR 只构建，`main` 推送才发布

## 已完成

- Node.js、ESLint、类型检查和 CI 基线；
- 本地 OAuth 服务入口修复；
- Vite `/StarHub/` 与 VitePress `/StarHub/docs/`；
- 应用与文档联合产物；
- `.nojekyll` 与带提交 SHA 的 `deployment-info.json`；
- Pages 构建、上传、部署和公网冒烟测试；
- 开发分支部署限制诊断；
- 临时诊断工作流清理；
- 项目状态和交接文档更新。

## 诊断结论

开发分支可完成构建、Pages 配置和 artifact 上传，但 `github-pages` 环境在分配 runner 前拒绝生产部署。Pages 配置的 source 为 `main`，因此正式部署已限制为 `main`。

## 验证

```text
npm ci                    PASS
npm run lint              PASS，9 条非阻断警告
npm run type-check        PASS
npm run pages:build       PASS
Pages 配置读取            PASS
Pages artifact 上传       PASS（诊断运行）
Deploy Pages site         PENDING ON MAIN
Verify deployed site      PENDING ON MAIN
```

## 目标地址

```text
应用：https://hujinghaoabcd.github.io/StarHub/
文档：https://hujinghaoabcd.github.io/StarHub/docs/
```

## 未完成

- 合并 PR #3 并验证生产部署；
- 修复同步幽灵仓库和部分失败状态；
- 完成 OAuth 安全重构及 Worker 部署；
- 审查 33 个依赖漏洞；
- 建立单元与 E2E 测试。

## 下一步

1. 等待 PR CI；
2. 标记 Ready 并合并；
3. 验证 Pages 与公网资源；
4. 更新最终在线状态；
5. 开始同步修复。

后续每批必须更新已完成、未完成、验证、风险和交接文档。
