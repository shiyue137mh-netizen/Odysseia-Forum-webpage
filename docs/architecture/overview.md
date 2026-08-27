# 📖 项目概览 (Project Overview)

Odysseia Forum Webpage 是一个基于 **React 19** 与 **Vite 8 (Rolldown)** 构建的现代化单页应用 (SPA)。它采用了 Feature-Sliced Design (FSD) 理念，致力于提供流畅、美观、响应式的全平台论坛阅读与搜索体验。

## 1. 核心特性

- **极致性能**: 采用 Vite 8 与 **Rolldown** 引擎，实现秒级冷启动与极致的打包性能。
- **交互创新**: 引入多套深浅色主题，支持平滑的主题切换动画；附带增强搜索引导体验的“看板娘”系统（基于 **Motion 12**）。
- **类型安全**: 基于 **TypeScript 6.0**、Zod 与自动生成的 OpenAPI 类型规范，保证端到端类型安全。
- **数据流健壮**: 通过 `@tanstack/react-query` v5 彻底接管服务端并发与缓存逻辑。

## 2. 环境构建与运行

| 维度         | 本开发环境                                    | 生产环境                                          |
| ------------ | --------------------------------------------- | ------------------------------------------------- |
| **构建机制** | `pnpm dev` 使用 Vite 开发服务器，支持高效 HMR | `pnpm build` 使用 Rolldown 引擎生成极致压缩的产物 |
| **访问地址** | `http://localhost:3000`                       | 部署后的正式域名，通过 Cloudflare 边缘分发        |
| **API 指向** | 根据 `.env` 中填写的 `VITE_API_URL` 决定      | 指向正式后端域名                                  |

### 2.1 本地开发指南

1. 安装依赖（推荐使用 **pnpm**）：
   ```bash
   pnpm install
   ```
2. 配置环境变量：将 `.env.example` 复制一份命名为 `.env`（或 `.env.development`），并调整后端地址：
   ```env
   VITE_API_URL=http://localhost:10810/v1
   ```
3. 启动开发服务器：
   ```bash
   pnpm dev
   ```
4. 打开浏览器访问 `http://localhost:3000` 即可开始调试。

### 2.2 打包发布

执行打包命令：

```bash
pnpm build
```

产物将输出至 `dist/` 目录。你只需将其托管至任何静态服务容器（例如 Nginx, Cloudflare Pages, Vercel 等）并配置好 API 跨域即可。

## 3. 代码审查及提交规范

- 提交前请在本地跑一遍 CI 的五道门禁：`pnpm typecheck`、`pnpm lint`、`pnpm lint:styles`、`pnpm test:run`、`pnpm build`。
  （注意用 `test:run` 而不是 `test`——后者是 watch 模式，不会自己退出。）
- **特别注意**：本项目已升级至 **Tailwind CSS v4** 和 **React 19**，请务必阅读 `docs/architecture/core_architecture.md` 了解最新的“现代化范式”，避免使用诸如 `forwardRef` 等旧模式。
