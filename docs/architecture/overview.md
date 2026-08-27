# 项目概览

Odysseia Forum Webpage 是一个 React 19 + Vite 8 的单页应用（SPA），前端源码位于仓库根目录的 `src/`。当前页面通过 React Router 分发，登录后的页面共享 `RootLayout` 应用壳；搜索、发现、书单、赛事、关注、偏好和 AI 搜索等能力按 FSD 切片组织。

## 当前运行方式

| 项目 | 当前事实 |
| --- | --- |
| 开发命令 | `pnpm dev` |
| 开发端口 | Vite 配置固定为 `3000`，服务监听 `host: true` |
| API 地址 | `VITE_API_URL`；未设置时客户端默认 `http://localhost:10810/v1` |
| `/api` 代理 | Vite 开发服务器把 `/api` 代理到 `VITE_BACKEND_URL`，缺省为 `https://forum.shimmerday.top`；业务 `apiClient` 默认使用 `VITE_API_URL`，两者不是同一配置 |
| 构建命令 | `pnpm build`，先执行 TypeScript 增量构建，再执行 Vite 构建 |
| 构建产物 | `dist/` |

最小本地流程：

```bash
pnpm install
pnpm dev
```

如需指向本地后端，设置 `VITE_API_URL=http://localhost:10810/v1`。具体部署平台、域名和边缘缓存不由本仓库源码保证，应以对应部署文档和环境配置为准。

## 验证脚本

`package.json` 提供以下检查入口：`pnpm typecheck`、`pnpm lint`、`pnpm lint:styles`、`pnpm test:run`、`pnpm build`。它们覆盖范围不同，单次改动应按风险选择，不应把未执行的命令描述为通过。与 OpenAPI 类型同步使用 `pnpm gen:api`；OG 专项检查使用 `pnpm check:og`。

## 关键边界

- 服务端数据和缓存由 React Query 管理；页面不应自行建立第二套远程缓存。
- 普通搜索的可分享条件以 URL 为准；本地设置、搜索历史和浏览足迹不属于 URL 状态。
- AI 搜索是浏览器端可选能力，模型服务由用户配置的外部 OpenAI-compatible Provider 提供，论坛 API 仍由前端现有 API 层调用。
- `src/pages/TestPage.tsx` 及 `/test` 路由只在开发环境或启用 mock 时注册；不要把它当成生产页面。
