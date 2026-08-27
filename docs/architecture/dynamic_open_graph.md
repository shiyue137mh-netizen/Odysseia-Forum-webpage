# 动态 Open Graph 当前架构

> 状态：书单、赛事、帖子和作者的 canonical 页面均已接入 crawler-only 动态 OG。
>
> 更新时间：2026-08-28

本文描述当前仓库实现；生产环境变量、线上 Function 和实际分享平台缓存仍需按验收章节独立确认。

## 1. 目标与边界

Odysseia Forum 是部署在 Cloudflare Pages 上的 React SPA。普通浏览器和社交爬虫访问同一个
canonical URL，但两者需要不同的服务器响应：

- 普通浏览器直接取得 SPA shell，由 React 渲染页面；
- 已识别的社交爬虫取得注入资源元数据后的 SPA shell；
- `og:image` 指向独立部署在 Vercel 的动态 PNG 服务。

这套架构不使用 SSR，不公开论坛业务接口，也不把机器凭证发送给浏览器。历史 `/share/*`
专用路径已经退出当前实现，不应继续用于分享或验收。

## 2. 当前覆盖范围

| canonical URL | Cloudflare Function | 内部元数据端点 | 图片类型 |
| --- | --- | --- | --- |
| `/booklists/{id}` | `functions/booklists/[id].js` | `/internal/share-metadata/booklists/{id}` | `booklists` |
| `/tournaments/{id}` | `functions/tournaments/[id].js` | `/internal/share-metadata/booklists/{id}` | `tournaments` |
| `/threads/{id}` | `functions/threads/[id].js` | `/internal/share-metadata/threads/{id}` | `threads` |
| `/u/{id}` | `functions/u/[id].js` | `/internal/share-metadata/authors/{id}` | `authors` |

赛事复用书单端点，因为赛事当前由 `is_tournament = true` 的书单承载；页面路径和图片模板仍
保持赛事语义。

Cloudflare 的 `public/_routes.json` 只将上述四类路径交给 Pages Functions：

```json
{
  "version": 1,
  "include": ["/booklists/*", "/tournaments/*", "/threads/*", "/u/*"],
  "exclude": []
}
```

## 3. 请求链

四个 Function 都通过 `functions/_shared/og.js` 的 `createShareMetadataHandler` 创建，并设置
`crawlerOnly: true`。

### 3.1 普通浏览器

```text
GET canonical URL
  -> Pages Function 识别为非社交爬虫
  -> env.ASSETS.fetch('/')
  -> 200 SPA shell
  -> React 挂载页面
```

普通浏览器不会请求内部分享元数据，不会发生 302 跳转。

### 3.2 社交爬虫

```text
Discordbot 等爬虫 GET canonical URL
  -> Cloudflare Pages Function 读取 OG_SERVICE_TOKEN
  -> 请求 Python 后端内部分享元数据
  -> HTMLRewriter 注入 title、description、og:* 和 twitter:* 元数据
  -> og:image 指向 Vercel /api/og/{type}/{id}?v=...
  -> 爬虫请求 Vercel 图片 URL
  -> Vercel 使用自己的 OG_SERVICE_TOKEN 读取同类内部元数据
  -> Satori/Resvg 生成 PNG，失败则返回 fallback.png
```

Cloudflare 和 Vercel 会分别读取一次内部元数据：前者生成 HTML 元数据，后者生成图片。两个
运行环境都需要机器 Token，但 Token 不会出现在页面 HTML 或图片 URL 中。

## 4. HTML 元数据

Cloudflare Function 会重写：

- `<title>` 和 `meta[name="description"]`；
- `og:type`、`og:url`、`og:title`、`og:description`、`og:image`；
- `twitter:title`、`twitter:description`、`twitter:image`。

`og:url` 使用去除查询参数和 hash 后的当前 canonical URL。标题、描述和统计摘要由各类型的
`build*OgMetadata` 函数生成；文本会压缩空白，并在需要时截断。

后端 DTO 的正式契约由当前 OpenAPI 定义维护：

- `ThreadShareMetadataDTO`；
- `AuthorShareMetadataDTO`；
- `BooklistShareMetadataDTO`。

对应生成类型位于 `src/shared/types/openapi.d.ts`。本文档不复制完整字段清单，避免契约变更后
出现第二份过期 Schema。

书单/赛事 DTO 的主封面字段以 OpenAPI 的 `cover_image_url` 为准，Vercel 卡片主要读取
`works[].image_url`。Cloudflare builder 当前仍读取 `image_url` 作为中间 fallback，但在元数据
请求成功后，最终 `og:image` 会被 Vercel 图片 URL 覆盖；该中间字段不应被视为正式 DTO 契约。

## 5. Vercel 动态图片

Cloudflare 成功取得元数据后，图片 URL 固定按以下形式生成：

```text
https://odysseia-forum-og.vercel.app/api/og/{type}/{id}?v={updated_at}-{revision}
```

默认服务地址由 `functions/_shared/og.js` 中的 `DEFAULT_OG_IMAGE_BASE_URL` 提供。它是公开 URL，
不是凭证；`OG_IMAGE_BASE_URL` 仅用于部署时可选覆盖，未配置时必须继续使用代码内置默认值。

版本参数由后端 `updated_at` 和前端图片布局 revision 组合而成。带 `v` 的成功图片响应使用一年
不可变缓存；无 `v` 的直接调试请求使用较短缓存。

Vercel 图片服务位于 `playground/og-satori`，当前支持：

```text
/api/og/threads/{id}
/api/og/authors/{id}
/api/og/booklists/{id}
/api/og/tournaments/{id}
```

路由运行在 Node.js runtime，逻辑布局为 `1200×630`，输出为 `1800×945` PNG。

## 6. 配置边界

### 6.1 Cloudflare Pages Functions

| 变量 | 必需 | Secret | 说明 |
| --- | --- | --- | --- |
| `OG_SERVICE_TOKEN` | 动态元数据必需 | 是 | 后端只读 OG 机器凭证；缺失时回退静态默认 OG |
| `API_BASE_URL` | 否 | 否 | 后端 `/v1` 基地址；未配置时使用代码默认值 |
| `OG_IMAGE_BASE_URL` | 否 | 否 | 公开图片服务地址的可选覆盖；未配置时使用内置 Vercel 地址 |

这些是 Pages Functions 运行时变量，不使用 `VITE_` 前缀。Production 和 Preview 环境需要分别
配置 Secret。

### 6.2 Vercel OG 服务

| 变量 | 必需 | Secret | 说明 |
| --- | --- | --- | --- |
| `OG_SERVICE_TOKEN` | 动态图片必需 | 是 | 后端只读 OG 机器凭证 |
| `API_BASE_URL` | 否 | 否 | 后端 `/v1` 基地址；未配置时使用代码默认值 |

Vercel 变量不使用 `NEXT_PUBLIC_` 或 `VITE_` 前缀。

## 7. 公开与安全边界

- canonical 页面 URL、Vercel 图片 URL 和 `OG_IMAGE_BASE_URL` 都是公开信息；
- `OG_SERVICE_TOKEN` 只能保存在 Cloudflare、Vercel 和后端的服务端 Secret 中；
- Function 不转发用户 Cookie、登录 Token 或完整业务响应；
- 内部端点只返回允许出现在分享卡片中的数据；
- 私有、不存在、已删除或不允许分享的资源由后端统一隐藏；
- 日志不得记录 Authorization Header、机器 Token 或完整敏感响应体；
- 资源 ID 只接受纯数字；Cloudflare 元数据输入允许 HTTP(S)，Vercel 图片渲染只接受 HTTPS，
  因此生产 DTO 的远程图片应使用 HTTPS；
- Function 返回 `Content-Security-Policy: frame-ancestors 'none'` 和
  `X-Frame-Options: DENY`。

只要内容已经进入公开分享卡片，持有链接的客户端和 Bot 就能读取它。安全边界应保护机器凭证
和非公开数据，而不是把公开图片服务域名伪装成秘密。

## 8. 故障回退

| 故障 | 当前行为 |
| --- | --- |
| 非数字资源 ID | 返回原始 SPA shell |
| 普通浏览器请求 | 返回原始 SPA shell，不访问内部元数据 |
| Cloudflare 缺少 `OG_SERVICE_TOKEN` | 返回原始 SPA shell 和静态默认 OG |
| 后端超时、拒绝或返回无效数据 | 返回原始 SPA shell 和静态默认 OG |
| Vercel 缺少 `OG_SERVICE_TOKEN` | 返回 `playground/og-satori/public/fallback.png`，带 `X-OG-Fallback: missing-token` |
| Vercel 图片类型未知或 ID 非数字 | 返回 HTTP 404，不返回 fallback 图片 |
| Vercel 资源不存在 | 返回 `playground/og-satori/public/fallback.png`，带 `X-OG-Fallback: not-found` |
| Vercel 渲染或依赖请求失败 | 返回 `playground/og-satori/public/fallback.png`，带 `X-OG-Fallback: render-error` |

Cloudflare 元数据成功而 Vercel 图片失败时，标题和描述仍可保持动态，只有图片回退。动态 OG
故障不应让 canonical 页面返回 500。

## 9. 验收

本地逻辑自检：

```bash
pnpm check:og
```

部署后验证普通浏览器 User-Agent 不触发动态元数据：

```bash
curl -s https://你的域名/booklists/书单ID
```

验证社交爬虫取得 canonical 页面的动态元数据：

```bash
curl -s -A Discordbot https://你的域名/booklists/书单ID
curl -s -A Discordbot https://你的域名/tournaments/赛事ID
curl -s -A Discordbot https://你的域名/threads/帖子ID
curl -s -A Discordbot https://你的域名/u/作者ID
```

原始 HTML 应包含对应的 `og:title`、`og:description`、canonical `og:url`，以及指向当前图片
服务 `/api/og/...` 的 `og:image`。未设置覆盖变量时，默认域名是
`odysseia-forum-og.vercel.app`。

当前默认图片服务可单独检查：

```bash
curl -sS -D - -o /dev/null \
  https://odysseia-forum-og.vercel.app/api/og/booklists/书单ID?v=测试版本
```

成功响应应为 `Content-Type: image/png`。若收到 `X-OG-Fallback`，应按其值检查 Token、资源或
渲染日志。最终还需要在实际分享平台使用新 URL 或新版本参数确认平台缓存后的卡片表现。

## 10. 维护同步规则

修改以下任一项时，应在同一变更中核对本文档、Cloudflare 部署文档和 Vercel 服务 README：

- canonical 路由或 `public/_routes.json`；
- 内部分享元数据端点或 OpenAPI DTO；
- `DEFAULT_API_BASE_URL`、`DEFAULT_OG_IMAGE_BASE_URL` 或图片 revision；
- crawler-only 判定和故障回退；
- Vercel 图片路由、缓存策略或必需环境变量。

历史实验、迁移计划和已废弃 `/share/*` 路径应保留在 Git 历史或独立调研记录中，不再混入
“当前架构”文档。
