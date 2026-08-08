# 动态 Open Graph 跨端实施方案

> 状态：书单专用分享 URL 已接入；正常页面不再请求分享元数据，待部署验收。
>
> 更新时间：2026-08-05

## 1. 文档目的

Odysseia Forum 当前是部署在 Cloudflare Pages 上的 React SPA。所有页面返回同一份静态
`index.html`，因此书单、赛事、作者和帖子链接在 Discord 等社交平台中始终显示站点默认
标题、描述和图片。

本文档用于协调前端、Cloudflare Pages Functions 与 Python 后端的改造，目标是在不改为
SSR、不生成新图片、不开放论坛业务接口的前提下，为允许分享的资源返回动态 OG 元数据。

帖子、作者以及书单多封面的后端字段与验收要求见
[动态 Open Graph 后端接口需求](./dynamic_open_graph_backend_requirements.md)。

第一阶段只覆盖书单：

```text
https://odysseia-forum-webpage.pages.dev/share/booklists/{booklist_id}
```

书单闭环验证成功后，再评估赛事、作者与帖子。

## 2. 基本原理

Discord 分享链接时不会执行 React JavaScript。Discordbot 只读取服务器返回的原始 HTML：

```html
<meta property="og:title" content="书单标题" />
<meta property="og:description" content="书单简介" />
<meta property="og:image" content="https://cdn.discordapp.com/attachments/..." />
```

动态 OG 的请求链路为：

```text
Discordbot
    ↓ 匿名 GET /share/booklists/{id}
Cloudflare Pages Function
    ↓ 携带机器凭证请求元数据
Python 后端内部接口
    ↓ 校验机器身份、资源分享状态、选择封面
最小分享元数据
    ↓
Pages Function 使用 HTMLRewriter 改写 index.html
    ↓
Discordbot 根据 og:image 下载 Discord CDN 图片
```

`og:image` 中只需要填写完整的图片 URL。图片二进制不需要经过 Function，也不需要存入
Cloudflare Pages。

## 3. 当前实现与已验证事实

前端仓库已经包含：

- `functions/share/booklists/[id].js`：书单动态 OG Pages Function；
- `functions/booklists/[id].js`：只返回 SPA 外壳，不访问分享元数据接口；
- `public/_routes.json`：注册书单详情和专用分享路由；
- `scripts/check-booklist-og.mjs`：基于内部分享接口 DTO 的本地自检；
- `pnpm check:og`：自检命令。

Cloudflare 生产部署日志已经确认：

- `/functions` 被正确识别；
- Worker 编译成功；
- `_routes.json` 被正确上传；
- `/booklists/4618?og-test=1` 成功触发 Function；
- Function 最终返回 HTTP 200。

旧版动态 OG 没有出现的直接原因是 Function 匿名访问业务接口，后端返回了
`401 Unauthorized`：

```text
Booklist OG metadata failed
Error: API request failed: 401
```

Function 捕获异常后按设计返回默认 `index.html`，因此 Cloudflare 控制台显示 `Ok`，Discord
仍显示站点默认 OG。

后端现已提供带机器认证的内部接口，Pages Function 改为通过该接口获取最小分享元数据：

```text
GET /v1/internal/share-metadata/booklists/{booklist_id}
```

## 4. 访问与公开边界

论坛业务资源继续要求用户登录。动态 OG 不应让现有用户 Token、Cookie 或完整业务接口公开。

但是，只要一项数据出现在 Discord 分享卡片中，该项数据就已经对持有链接的人公开。第一阶段
建议只允许公开书单输出以下字段：

- 书单标题；
- 书单简介；
- 帖子数量；
- 允许作为封面的 Discord CDN URL；
- 最后更新时间；
- 当前页面的正式 URL。

不得返回：

- 用户登录 Token 或 Cookie；
- 私有书单元数据；
- 书单管理状态、内部备注或管理字段；
- 完整帖子正文；
- 当前用户收藏状态；
- 与生成分享卡片无关的作者隐私信息。

私有、不存在、已删除或不允许分享的资源应统一返回 `404`，避免利用状态码探测资源是否存在。

## 5. 推荐认证方案

### 5.1 使用受限机器 Token

后端生成一枚与用户账户无关的随机机器凭证：

```text
OG_SERVICE_TOKEN=<至少 32 字节的高强度随机值>
```

同一凭证分别保存到：

- Python 后端 Secret/环境变量；
- Cloudflare Pages 的 **Settings > Variables and Secrets**，类型必须为 Secret。

禁止：

- 使用 `VITE_OG_SERVICE_TOKEN`；
- 将 Token 写入仓库、构建产物或日志；
- 使用个人登录 Token 作为长期正式凭证；
- 让机器 Token 获得创建、修改、删除或管理权限。

Function 请求示例：

```http
GET /v1/internal/share-metadata/booklists/4618
Authorization: Bearer <OG_SERVICE_TOKEN>
Accept: application/json
```

固定机器 Token 经 TLS 传输即可满足第一阶段需求。暂不增加 HMAC 时间戳签名、密钥轮换服务或
多租户权限系统；如后续出现更高安全要求，再升级认证方式。

### 5.2 为什么不使用个人 Token

个人 Token 虽然可以快速绕过 `401`，但权限过大、会随用户会话失效，并把边缘 Function 与
个人账户生命周期绑定。如果代码或部署权限被攻破，影响范围会扩大到该账户能够读取的资源。

个人 Token 只能用于临时排错，不进入正式方案。

## 6. 后端接口契约

### 6.1 推荐端点

```text
GET /v1/internal/share-metadata/booklists/{booklist_id}
```

该端点不是公开 API。缺少或携带错误机器 Token 时返回 `401`。

### 6.2 成功响应

```json
{
  "title": "夏夜角色卡收藏",
  "description": "整理的一组夏日角色卡",
  "image_url": "https://cdn.discordapp.com/attachments/...",
  "item_count": 12,
  "collection_count": 3,
  "view_count": 120,
  "updated_at": "2026-08-02T13:00:00Z"
}
```

字段约束：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 是 | 书单标题，后端应去除首尾空白 |
| `description` | string/null | 否 | 书单简介；为空时由 Function 生成数量描述 |
| `image_url` | string/null | 否 | 当前有效的 HTTP(S) Discord CDN URL |
| `item_count` | integer | 是 | 书单内帖子数量 |
| `collection_count` | integer | 否 | 收藏次数；提供后固定显示在 OG 描述末尾 |
| `view_count` | integer | 否 | 浏览次数；提供后固定显示在 OG 描述末尾 |
| `updated_at` | ISO 8601 string | 是 | 用于后续缓存和失效策略 |

响应不需要复用完整 `BooklistDetail`。使用独立最小 DTO，避免业务模型以后新增字段时被无意
暴露到分享层。

### 6.3 状态码

| 状态码 | 含义 |
| --- | --- |
| `200` | 机器认证成功，资源允许生成分享元数据 |
| `401` | 缺少或携带错误的机器 Token |
| `404` | 资源不存在、已删除、为私有或不允许分享 |
| `500` | 后端内部错误；Function 将回退站点默认 OG |

### 6.4 封面选择

封面选择应由后端统一完成：

```text
有效的 booklist.cover_image_url
    ↓ 没有
按照书单 default_sort_method/default_sort_order 查询第一个帖子
    ↓
第一个有效 thumbnail_urls[0]
    ↓ 没有
image_url = null
```

Function 在 `image_url = null` 时使用站点默认 `/og-image-202608.png`。

后端负责这段逻辑的原因：

- 后端掌握书单真实默认排序；
- 避免 Function 分别请求详情和书单项；
- 避免前后端出现不同的“第一个帖子”定义；
- 后端有能力在需要时重新读取 Discord 消息，取得新的附件签名 URL。

## 7. Discord CDN 行为

Discord 消息附件通常使用带签名的 CDN URL：

```text
https://cdn.discordapp.com/attachments/.../image.png?ex=...&is=...&hm=...
```

- `ex`：到期时间；
- `is`：签发时间；
- `hm`：签名。

持有完整且未过期 URL 的客户端可以在 Discord 平台之外下载图片，CDN 下载阶段通常不会再次
检查访问者是否属于服务器。频道权限主要在“读取消息并取得新 URL”时校验。

因此：

- Discordbot 可以根据 `og:image` 直接下载有效 CDN 图片；
- Function 不需要代理或下载图片；
- 有效期内，能读取 OG HTML 的人也能复制该 URL；
- URL 过期后，必须由仍有 Discord 消息权限的后端/Bot 重新获取；
- 如果某张图不允许通过分享卡片公开，就不能把它设置为 `og:image`。

第一阶段不增加图片代理、R2 镜像或动态 PNG 生成。

## 8. Pages Function 实现

`functions/share/booklists/[id].js` 当前实现：

1. 从 `env.OG_SERVICE_TOKEN` 读取机器 Secret；
2. 只请求一次内部分享元数据接口；
3. 携带 `Authorization: Bearer ...`；
4. 使用后端返回的 `image_url`，为空则使用默认图；
5. 继续通过 `env.ASSETS.fetch('/')` 获取 React 应用壳；
6. 使用 `HTMLRewriter` 替换 HTML 与 Twitter/OG 元数据；
7. 后端超时、`401`、`404` 或无效响应时回退默认 OG；
8. 日志只记录状态码和资源 ID，不记录 Secret 或完整签名图片 URL。

普通浏览器访问分享 URL 时，在请求后端之前直接 `302` 到 `/booklists/{id}`；社交爬虫才读取
分享元数据。OG 简介会压缩空白并截断过长正文，统计数据固定追加在末尾。

Function 输出字段：

- `<title>`；
- `meta[name="description"]`；
- `og:type`；
- `og:url`；
- `og:title`；
- `og:description`；
- `og:image`；
- `twitter:title`；
- `twitter:description`；
- `twitter:image`。

不使用 `Date.now()` 给图片添加缓存参数。它会让每次请求都产生新 URL，破坏 Discord 与 CDN
缓存。若后续需要版本参数，只能使用稳定的 `updated_at` 或内容版本号。

## 9. Cloudflare 配置

### 9.1 Pages Secret

生产与 Preview 环境分别配置：

```text
OG_SERVICE_TOKEN
```

如果生产后端地址变化，可以额外配置：

```text
API_BASE_URL=https://forum.shimmerday.top/v1
```

### 9.2 Function 路由

第一阶段保持：

```json
{
  "version": 1,
  "include": ["/booklists/*", "/share/booklists/*", "/tournaments/*", "/share/tournaments/*", "/threads/*", "/u/*"],
  "exclude": []
}
```

这样普通静态资源和其他页面不会触发 Function 请求计费。

### 9.3 `_redirects` 独立问题

2026-08-02 的 Cloudflare 部署日志将现有规则：

```text
/* /index.html 200
```

判定为无限循环并忽略。该警告不是动态 OG 失败原因，因为书单 Function 使用
`env.ASSETS.fetch('/')`，但它可能影响其他 SPA 子路由直接刷新。应作为独立部署问题处理，
不要通过修改 OG Function 绕过。

## 10. 安全要求

后端：

- 使用常量时间比较验证机器 Token，例如 Python `hmac.compare_digest`；
- 服务启动时若 Secret 缺失，内部接口应拒绝启动或始终返回 `503`；
- 只允许 `GET`；
- 校验书单 ID；
- 只返回允许分享的最小 DTO；
- 私有与不存在资源统一为 `404`；
- 不记录 Authorization Header；
- 对内部接口增加合理的速率限制和超时；
- 准备 Secret 轮换方式。

Cloudflare Function：

- Secret 只从 `env` 读取；
- 不向浏览器返回 Secret；
- 不把后端错误栈、响应体或 Secret 写入 HTML；
- 后端异常时安全回退默认 OG；
- 只接受数字书单 ID；
- 只接受 HTTP(S) 图片 URL。

## 11. 实施顺序

### 阶段 A：后端

- [ ] 确认生产环境已配置 `OG_SERVICE_TOKEN`；
- [ ] 验证无 Token、错误 Token、公开书单和私有书单行为；
- [x] 新增书单最小分享 DTO；
- [x] 新增内部书单分享元数据接口；
- [ ] 验证后端封面选择和私有书单隐藏规则。

### 阶段 B：Cloudflare/前端

- [ ] 在 Cloudflare Production 和 Preview 配置 `OG_SERVICE_TOKEN` Secret；
- [x] Function 改为调用内部接口并携带机器认证；
- [x] 删除 Function 内第二次书单项请求；
- [x] 更新 `pnpm check:og` 模拟契约；
- [ ] 部署 Preview 并读取原始 HTML；
- [ ] 部署 Production；
- [ ] 验证 Discord 分享卡片。

### 阶段 C：后续扩展

书单闭环已经验证，当前前端准备状态：

- [x] `/tournaments/{id}`：复用书单分享接口与数据模型；
- [x] `/threads/{thread_id}`：建立站内详情 URL，复用现有帖子详情与预览组件；
- [x] `/u/{user_id}`：Function 已能稳定返回 SPA 外壳；
- [ ] 帖子内部分享元数据接口；
- [ ] 作者内部分享元数据接口；
- [ ] 作者合成 OG 图片；
- 分享凭证：只有需要为私有资源显式授权分享时再引入；
- 图片代理/R2：只有 Discord 附件过期成为实际故障时再考虑。

帖子建议返回：

```json
{
  "title": "帖子标题",
  "description": "首条消息摘要",
  "image_url": "https://cdn.discordapp.com/attachments/...",
  "author_name": "作者名",
  "updated_at": "2026-08-05T13:00:00Z"
}
```

作者普通 OG 与后续合成图片共用同一份数据：

```json
{
  "display_name": "作者名",
  "avatar_url": "https://cdn.discordapp.com/avatars/...",
  "stats": {
    "thread_count": 12,
    "reaction_count": 345,
    "reply_count": 67
  },
  "latest_work_title": "最新作品标题",
  "works": [
    { "title": "作品一", "image_url": "https://cdn.discordapp.com/attachments/..." },
    { "title": "作品二", "image_url": "https://cdn.discordapp.com/attachments/..." },
    { "title": "作品三", "image_url": "https://cdn.discordapp.com/attachments/..." }
  ],
  "updated_at": "2026-08-05T13:00:00Z"
}
```

作者合成图固定展示作者名、三项统计、最新作品标题与最多三张作品封面。第一阶段不在
Cloudflare 引入 Satori/Resvg；后端接口接通后先验证普通 OG，再单独评估图片生成和缓存。

## 12. 验收标准

### 后端接口

```bash
curl -i https://后端域名/v1/internal/share-metadata/booklists/4618
```

无 Token 必须返回 `401`。

```bash
curl -i \
  -H 'Authorization: Bearer <OG_SERVICE_TOKEN>' \
  https://后端域名/v1/internal/share-metadata/booklists/4618
```

允许分享的书单必须返回最小 DTO；私有书单必须返回 `404`。

### Pages Function

```bash
curl -s \
  -A Discordbot \
  https://前端域名/share/booklists/4618?og-test=版本号
```

原始 HTML 必须包含：

```html
<meta property="og:title" content="《实际书单标题》· 类脑索引">
<meta property="og:description" content="实际书单简介或数量描述">
<meta property="og:image" content="实际 Discord CDN URL">
<meta property="og:url" content="https://前端域名/share/booklists/4618">
```

同时验证：

- 普通浏览器打开书单页面仍能挂载 React；
- API 暂时不可用时返回默认 OG，而不是 500；
- Cloudflare Console 不再出现 `API request failed: 401`；
- Discord 使用新测试查询参数时显示书单专属预览。

## 13. 暂不实施

当前明确暂缓：

- 使用个人登录 Token；
- 开放匿名书单详情 API；
- 为每个书单生成数据库分享 Token；
- Satori/Resvg 动态生成图片；
- Cloudflare 图片代理；
- R2 持久化 Discord 图片；
- 动态标题或浏览器端 OG 修改；
- 在作者数据接口接通前引入 Satori/Resvg。

先完成书单最小闭环，再依据真实故障和使用量决定是否扩展。
