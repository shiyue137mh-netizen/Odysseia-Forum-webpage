# Cloudflare Pages 部署指南

## 概述

本文档说明如何将 Odysseia Forum 前端应用部署到 Cloudflare Pages。

## 前置要求

- Cloudflare 账号
- GitHub/GitLab 仓库访问权限
- 后端 API 已部署并可访问

## 部署步骤

### 1. 创建 Cloudflare Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** > **Pages**
3. 点击 **Create a project** > **Connect to Git**
4. 选择你的 Git 仓库（GitHub 或 GitLab）
5. 授权 Cloudflare 访问仓库

### 2. 配置构建设置

在项目配置页面，设置以下参数：

#### 基本设置

- **项目名称**: `odysseia-forum-web`（或自定义）
- **生产分支**: `main`（或你的主分支）
- **根目录**: `/`（`package.json` 与 `functions/` 都在当前仓库根目录）

#### 构建设置

- **框架预设**: `Vite`
- **构建命令**: `pnpm build`
- **构建输出目录**: `dist`
- **Node.js 版本**: `22`（与当前 CI 一致）

### 3. 环境变量配置

在 **Settings** > **Environment variables** 中配置浏览器构建变量：

| 变量名 | 必需 | 默认值/说明 |
| --- | --- | --- |
| `VITE_API_URL` | 生产必需 | API `/v1` 基地址；未配置会回退到本机 `http://localhost:10810/v1`，不适合生产 |
| `VITE_BACKEND_URL` | 建议配置 | OAuth 登录入口和本地 Vite 代理目标；默认 `https://forum.shimmerday.top` |
| `VITE_GUILD_ID` | 否 | Discord 链接缺少 guild ID 时的回退；未配置时使用 `@me` |
| `VITE_RELEASE_FEED_URL` | 否 | 更新公告源；默认 `/notifications/updates.yaml` |
| `VITE_USE_MOCK` | 否 | 仅开发环境登录 Mock；生产保持 `false` |
| `VITE_API_MOCKING` | 否 | 控制 Mock 控制台和测试路由；生产保持 `false` |
| `VITE_SHOW_DEVTOOLS` | 否 | 是否显示 React Query Devtools；生产通常保持 `false` |

只有需要暴露给浏览器代码的变量才使用 `VITE_` 前缀。Cloudflare 构建环境的 Node.js 版本单独
设置为 `22`，它不是浏览器变量。

Pages Functions 的运行时变量不受 Vite 的 `VITE_` 规则限制。动态 OG 使用以下配置：

| 变量名 | 必需 | Secret | 说明 |
| --- | --- | --- | --- |
| `OG_SERVICE_TOKEN` | 动态元数据必需 | 是 | 后端只读 OG 机器凭证；Production 和 Preview 分别配置 |
| `API_BASE_URL` | 否 | 否 | 后端 `/v1` 基地址；未配置时默认使用 `https://forum.shimmerday.top/v1` |
| `OG_IMAGE_BASE_URL` | 否 | 否 | 公开图片服务地址的可选覆盖；未配置时使用代码内置的 Vercel 地址 |

`OG_IMAGE_BASE_URL` 是公开 URL，不是 Secret，也不是部署必填项。当前代码默认使用
`https://odysseia-forum-og.vercel.app`。

### 4. 部署

1. 点击 **Save and Deploy**
2. Cloudflare Pages 会自动：
   - 克隆仓库
   - 安装依赖（`pnpm install --frozen-lockfile`）
   - 运行构建（`pnpm build`）
   - 部署到 CDN

3. 等待构建完成；耗时取决于依赖缓存和 Cloudflare 构建队列

### 5. 验证部署

部署完成后，访问 Cloudflare 提供的域名（例如 `odysseia-forum-web.pages.dev`）：

#### 验证清单

- [ ] 页面能正常加载（无白屏）
- [ ] 刷新任意子路由（如 `/login`, `/search`）不报 404
- [ ] 侧边栏显示频道列表
- [ ] 搜索功能正常
- [ ] 登录跳转正常（需确保后端 CORS 和回调 URL 配置正确）

## 关键配置文件

### `public/_redirects`

```
/* /index.html 200
```

此文件为未命中 Pages Function 的前端路由返回 `index.html`，实现 SPA 路由回退。已经命中
Function 的四类 canonical OG 路由不依赖这条规则。该文件会自动包含在构建输出中。

### `public/_routes.json`

```json
{
  "version": 1,
  "include": ["/booklists/*", "/tournaments/*", "/threads/*", "/u/*"],
  "exclude": []
}
```

书单、赛事、帖子和作者的 canonical 路由均已接入 crawler-only 动态 OG。其他页面和静态资源
继续走静态托管。历史 `/share/*` 路径不在当前 Function 路由中，不应用于分享或验收。

### 动态 OG

跨端认证、后端接口契约、安全边界和验收流程详见
[`docs/architecture/dynamic_open_graph.md`](../architecture/dynamic_open_graph.md)。当前 Pages
Function 已接入后端内部分享接口。部署前必须在 Cloudflare Production 和 Preview 环境分别
配置加密 Secret `OG_SERVICE_TOKEN`，否则会安全回退到站点静态默认 OG。

当前 Function 路径为：

```text
functions/booklists/[id].js
functions/tournaments/[id].js
functions/threads/[id].js
functions/u/[id].js
```

四类路由都只为已识别的社交爬虫读取分享元数据并重写 HTML。普通浏览器不会请求内部接口，
也不会发生 302，而是由 Function 通过 `env.ASSETS.fetch('/')` 直接返回 React SPA shell。
Cloudflare 不会对已经命中 Function 的请求应用 `public/_redirects`，因此这里必须显式获取 shell。

赛事复用书单分享接口，因为当前赛事本质上是 `is_tournament = true` 的书单。元数据注入成功
后，`og:image` 指向独立 Vercel 服务：

```text
https://odysseia-forum-og.vercel.app/api/og/{type}/{id}?v={updated_at}-{revision}
```

图片服务生成失败时会返回自身的 `fallback.png`；Cloudflare 内部元数据请求失败时则保留
SPA shell 中的静态默认 OG。

本地纯逻辑检查：

```bash
pnpm check:og
```

部署后可检查社交爬虫实际收到的原始 HTML：

```bash
curl -A Discordbot https://你的域名/booklists/书单ID
```

返回的 `<head>` 应包含该书单对应的 `og:title`、`og:description`、canonical `og:url`，以及
指向当前图片服务的 `og:image`；未配置 `OG_IMAGE_BASE_URL` 时默认指向 Vercel。帖子、赛事
和作者分别使用 `/threads/{id}`、`/tournaments/{id}` 和 `/u/{id}` 验收。

### `src/shared/config/channelCategories.private.ts`

静态频道配置，作为 API 失败时的回退数据。如果后端 `/meta/channels` 不可用，前端会自动使用此配置。

## 常见问题 & 注意事项

### ❌ 刷新页面出现 404

**原因**: 缺少 `_redirects` 文件  
**解决**: 确认 `public/_redirects` 文件存在，并且构建后被复制到 `dist/` 目录

### ❌ 侧边栏频道列表为空

**可能原因**:

1. 后端 `/meta/channels` API 不可用
2. CORS 配置问题

**解决**:

1. 检查后端 API 是否正常
2. 检查后端 CORS 配置，确保允许前端域名
3. 前端已内置回退机制，API 失败会自动使用静态配置

### ❌ 登录后跳转失败

**原因**: 后端 OAuth 回调或前端地址配置错误
**解决**: 在后端 `config.json` 中核对 `auth` 配置：

```json
{
  "auth": {
    "frontend_url": "https://your-domain.pages.dev",
    "redirect_uri": "https://your-api-domain.example/v1/auth/callback"
  }
}
```

`frontend_url` 是登录完成后返回的前端地址；`redirect_uri` 是 Discord OAuth 回调到后端的地址，
必须与 Discord 应用后台登记值一致，不能填写成前端首页。

### ⚠️ API 请求失败 (CORS)

**解决**: 后端必须允许当前前端 origin。当前后端配置入口是：

```json
{
  "api": {
    "cors_origins": ["https://your-domain.pages.dev"]
  },
  "auth": {
    "frontend_url": "https://your-domain.pages.dev"
  }
}
```

后端会合并 `api.cors_origins` 与 `auth.frontend_url`。不要在前端仓库复制或维护一套 FastAPI
中间件实现。

### ⚠️ 环境变量不生效

**原因**: Vite 只在构建时读取环境变量  
**解决**: 修改环境变量后，必须重新触发部署（或手动 Retry deployment）

## 自动部署

Cloudflare Pages 支持 Git 分支自动部署：

- **生产环境**: `main` 分支的 push 会自动触发生产部署
- **预览环境**: Pull Request 会自动创建预览部署，便于测试

## 自定义域名

1. 在 Cloudflare Pages 项目中，进入 **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入你的域名（如 `forum.odysseia.com`）
4. 按照提示添加 DNS 记录（CNAME）

## 性能与缓存

- **启用 Cloudflare CDN**: 自动启用，全球加速
- **压缩**: 已自动启用 Brotli/Gzip 压缩
- **缓存**: 静态资源自动缓存在 Cloudflare 边缘节点
- **构建分包**: 当前 `vite.config.ts` 将 React、React Query 和 Motion 拆为独立 vendor chunk

不要在文档中长期记录一次构建得到的固定 bundle 大小。需要评估体积时运行 `pnpm build` 或
`pnpm build:analyze`，以当次产物为准。

## 回滚部署

如果新版本有问题：

1. 进入 **Deployments** 页面
2. 找到之前的稳定版本
3. 点击 **...** > **Rollback to this deployment**

## 技术支持

如遇到部署问题，请检查：

1. Cloudflare Pages 构建日志
2. 浏览器开发者工具的控制台和网络面板
3. 后端 API 日志

---

**最后更新**: 2026-08-28
**文档版本**: 1.2
