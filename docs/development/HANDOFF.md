# StarHub 开发交接文档

## 1. 交接信息

- 交接日期：2026-08-02
- 当前分支：`agent/foundation-ci-sync`
- 基准分支：`main`
- 当前阶段：工程基础与 CI 基线
- 状态文档：`docs/development/PROJECT_STATUS.md`

## 2. 本批目标

建立后续持续重构所需的最小工程基础，并确保每次工作都留下明确的“已完成 / 未完成 / 验证 / 下一步”记录。

本批不直接改动 OAuth、同步算法和标签数据库模型，避免在尚未获得 CI 构建基线前同时引入多项高风险业务修改。

## 3. 本批已完成

### 根目录工程命令

`package.json` 已调整：

- `npm run lint`：只检查，不再自动修改文件；
- `npm run lint:fix`：需要时显式执行自动修复；
- `npm run type-check`：执行 Vue/TypeScript 类型检查；
- `npm run check`：依次执行 lint、类型检查和构建；
- `npm run server:dev`：从根目录启动本地 OAuth 服务。

### 本地 OAuth 服务入口

原 `server/package.json` 指向不存在的 `oauth-server.js`，现已统一改为：

```text
server/dev-server.js
```

可使用以下任一命令启动：

```bash
npm run server:dev
```

或：

```bash
cd server
npm install
npm run dev
```

### Node.js 版本

新增 `.nvmrc`：

```text
22
```

本地可执行：

```bash
nvm use
```

### GitHub Actions

新增 `.github/workflows/ci.yml`，触发条件包括：

- 推送到 `main`；
- 推送到 `agent/**`；
- 面向 `main` 的 Pull Request；
- 手动触发。

执行步骤：

1. Checkout；
2. 根据 `.nvmrc` 安装 Node.js；
3. `npm ci`；
4. `npm run lint`；
5. `npm run type-check`；
6. `npm run build`。

工作流使用 `actions/checkout@v6` 与 `actions/setup-node@v6`。

## 4. 修改文件

- `.github/workflows/ci.yml`
- `.nvmrc`
- `package.json`
- `server/package.json`
- `docs/development/PROJECT_STATUS.md`
- `docs/development/HANDOFF.md`

## 5. 尚未验证

当前执行环境没有 GitHub CLI，并且此前本地网络无法正常克隆 GitHub 仓库，因此本批尚未在本地执行：

```bash
npm ci
npm run lint
npm run type-check
npm run build
```

应以 GitHub Actions 首次运行结果作为当前代码库的真实质量基线。若 CI 失败，不应直接删除检查步骤，而应按日志逐项修复现有问题。

## 6. 已知高优先级问题

### OAuth 安全

- OAuth 请求缺少 `state`；
- 回调使用 `window.opener` 全局函数；
- token 交换使用 GET 风格参数；
- GitHub token 明文存入 localStorage；
- `appToken` 只是未验证的随机字符串。

### 仓库同步

当前同步把本地旧仓库先放入 Map，再合并远程数据，但不会删除已取消 Star 的仓库。下一批应优先修复此问题，并增加完整同步/部分失败状态。

### 标签数据模型

当前同时存在：

- `Tag.repos: number[]`
- `repoTags` 关系表

主要业务仍依赖前者，需制定迁移方案后统一为一套模型。

## 7. 下一批建议执行顺序

1. 查看本分支 GitHub Actions 结果；
2. 修复 CI 暴露出的 lint、类型或构建错误；
3. 为仓库同步逻辑编写纯函数或单元测试；
4. 修复“取消 Star 后仍保留”的问题；
5. 在同步完成后原子写入 IndexedDB；
6. 更新本文件与 `PROJECT_STATUS.md`；
7. 再进入 OAuth 安全重构。

## 8. 交接要求

后续每一批工作完成前必须：

- 更新 `PROJECT_STATUS.md` 的已完成与未完成清单；
- 更新本交接文档中的当前分支、修改文件、验证和下一步；
- 在 PR 描述中同步说明验证结果；
- 不把未经验证的高风险修改直接合并到 `main`。
