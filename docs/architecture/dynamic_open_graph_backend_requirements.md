# 动态 Open Graph 后端接口需求

> 面向：Odysseia Forum Python 后端维护者
>
> 状态：需求草案，供帖子、作者与书单分享接口评审
>
> 更新时间：2026-08-08

## 1. 目的

Cloudflare Pages Function 已经通过受限机器凭证读取书单分享元数据，并为 Discord 等社交平台
返回动态 Open Graph HTML。下一阶段需要后端把同一能力扩展到：

- 帖子；
- 作者；
- 书单与赛事的多封面、统计数据。

后端只负责返回安全、稳定、最小的分享数据，不负责生成 HTML、截断最终文案或合成
1200×630 图片。Cloudflare Function 负责：

- OG/Twitter 标签；
- 最终标题和描述文案；
- 日期与数字格式化；
- 图片排版与合成；
- 边缘缓存及失败降级。

视觉草稿仅用于说明未来可能展示哪些数据，不构成后端 HTML/CSS 实现要求。

## 2. 强制隐私边界

分享元数据响应中禁止返回任何 Discord ID，包括：

- 用户 ID；
- 服务器 ID；
- 频道 ID；
- 消息 ID；
- 帖子/Thread ID；
- Discord 权限组 ID。

请求路径中的资源标识只用于后端定位资源，不得在 JSON 响应中回显。作品数组同样不得返回
帖子 ID。

Discord CDN 附件 URL 的路径本身可能包含 Discord 生成的附件标识，这是图片可访问地址不可分割的
组成部分。接口只能返回完整图片 URL，不得另外解析或返回 URL 内部的服务器、频道、消息或附件 ID。

同时禁止返回：

- 用户 Token、Cookie 或授权信息；
- 当前访问用户状态；
- 私有书单和私有作品信息；
- 完整帖子正文；
- 内部审核备注、管理状态和权限字段；
- 与分享卡片无关的作者信息。

## 3. 认证与可见性

所有端点继续使用现有受限机器凭证：

```http
Authorization: Bearer <OG_SERVICE_TOKEN>
Accept: application/json
```

要求：

- 缺少或错误 Token 返回 `401`；
- 只允许 `GET`；
- 使用常量时间比较验证 Token；
- Token 不得写入日志或响应；
- 私有、不存在、已删除、审核不可见或禁止分享的资源统一返回 `404`；
- 不通过不同状态码泄露私有资源是否存在。

## 4. 推荐端点

```text
GET /v1/internal/share-metadata/threads/{thread_id}
GET /v1/internal/share-metadata/authors/{author_id}
GET /v1/internal/share-metadata/booklists/{booklist_id}
```

路径参数沿用现有资源路由。它们是 Function 已知的查询条件，不属于响应 DTO。

赛事当前本质上是 `is_tournament = true` 的书单，继续复用书单接口，不新增赛事专用后端端点。

每次请求必须一次返回生成分享卡片所需的完整数据。Cloudflare Function 不应再请求作者详情、
帖子列表或书单项接口拼装响应。

## 5. 通用字段规则

### 5.1 文本

- 后端去除字符串首尾空白；
- 标题不得为空；
- 描述允许为 `null`；
- 后端不负责最终 OG 字数截断；
- 不返回 Markdown 渲染结果或 HTML；
- 帖子描述使用首条消息的纯文本摘要，不返回完整正文。

建议接口侧设置防御性上限：

| 字段 | 建议最大长度 |
| --- | ---: |
| 标题 | 200 字符 |
| 作者显示名称 | 100 字符 |
| 描述/摘要 | 1000 字符 |
| 作品标题 | 200 字符 |

### 5.2 时间

- 全部使用带时区的 ISO 8601 UTC 字符串；
- 示例：`2026-08-08T12:00:00Z`；
- 后端不返回“3 天前”等本地化文本；
- `updated_at` 表示这份分享元数据最后发生实质变化的时间。

### 5.3 统计

- 所有计数均为大于等于 `0` 的整数；
- 数据不可用时使用 `null`，不要伪造 `0`；
- `reaction_count` 表示 Discord 反应总数，不应在后端描述为“点赞数”；
- `reply_count` 表示帖子回复数；
- `collection_count` 表示站内收藏次数；
- `view_count` 只用于后端已有可靠浏览统计的资源。

### 5.4 图片 URL

- 只接受完整的 `http://` 或 `https://` URL；
- 优先返回仍然有效的 Discord CDN URL；
- 无有效图片时返回 `null`；
- 不返回 Base64、文件路径或图片二进制；
- 后端不得为了凑足 5 张而重复图片；
- 同一响应中的图片 URL 应去重。

## 6. 帖子分享契约

### 6.1 成功响应

```json
{
  "title": "【侦探/强推理】兰斯伯里",
  "description": "一位在迷雾之都游走的私家侦探……",
  "image_url": "https://cdn.discordapp.com/attachments/.../cover.png",
  "author": {
    "display_name": "作者显示名称",
    "avatar_url": "https://cdn.discordapp.com/avatars/.../avatar.png"
  },
  "stats": {
    "reaction_count": 128,
    "reply_count": 36,
    "collection_count": 12
  },
  "created_at": "2026-08-08T12:00:00Z",
  "updated_at": "2026-08-08T13:00:00Z"
}
```

### 6.2 字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 是 | 帖子标题 |
| `description` | string/null | 否 | 首条消息纯文本摘要 |
| `image_url` | string/null | 否 | 单张帖子主图 |
| `author.display_name` | string | 是 | 可公开的作者显示名称 |
| `author.avatar_url` | string/null | 是 | 作者头像；不得同时返回用户 ID |
| `stats.reaction_count` | integer/null | 否 | 反应总数 |
| `stats.reply_count` | integer/null | 否 | 回复数 |
| `stats.collection_count` | integer/null | 否 | 站内收藏数 |
| `created_at` | ISO 8601 string | 是 | 帖子创建时间 |
| `updated_at` | ISO 8601 string | 是 | 分享元数据最后更新时间 |

### 6.3 主图选择

```text
按原始顺序检查 thumbnail_urls
    ↓
第一张有效且允许公开的 HTTP(S) 图片
    ↓ 没有
image_url = null
```

帖子只返回一张图片。第一阶段不为单帖返回多图数组。

## 7. 作者分享契约

### 7.1 成功响应

```json
{
  "display_name": "作者显示名称",
  "avatar_url": "https://cdn.discordapp.com/avatars/.../avatar.png",
  "stats": {
    "thread_count": 42,
    "reaction_count": 1250,
    "reply_count": 320
  },
  "latest_work": {
    "title": "最新发布的作品",
    "created_at": "2026-08-08T12:00:00Z"
  },
  "works": [
    {
      "title": "高反应作品一",
      "image_url": "https://cdn.discordapp.com/attachments/.../cover-1.png",
      "reaction_count": 520,
      "created_at": "2026-07-20T12:00:00Z"
    },
    {
      "title": "高反应作品二",
      "image_url": "https://cdn.discordapp.com/attachments/.../cover-2.png",
      "reaction_count": 410,
      "created_at": "2026-07-18T12:00:00Z"
    }
  ],
  "updated_at": "2026-08-08T13:00:00Z"
}
```

### 7.2 字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `display_name` | string | 是 | 可公开的作者显示名称 |
| `avatar_url` | string/null | 否 | 作者头像；不得同时返回用户 ID |
| `stats.thread_count` | integer/null | 否 | 公开作品总数 |
| `stats.reaction_count` | integer/null | 否 | 公开作品收到的反应总数 |
| `stats.reply_count` | integer/null | 否 | 公开作品收到的回复总数 |
| `latest_work` | object/null | 否 | 最新公开作品，与热门作品排序无关 |
| `latest_work.title` | string | 条件必填 | 最新作品标题 |
| `latest_work.created_at` | ISO 8601 string | 条件必填 | 最新作品创建时间 |
| `works` | array | 是 | 按反应数排序的代表作品，最多 5 项 |
| `works[].title` | string | 是 | 作品标题；不返回帖子 ID |
| `works[].image_url` | string | 是 | 作品封面 URL |
| `works[].reaction_count` | integer | 是 | 用于确认排序结果 |
| `works[].created_at` | ISO 8601 string | 是 | 用于同分排序 |
| `updated_at` | ISO 8601 string | 是 | 分享元数据最后更新时间 |

### 7.3 作品选择

候选作品必须同时满足：

- 属于该作者；
- 公开且允许分享；
- 未删除；
- 具有至少一张有效、允许公开的封面；
- 封面 URL 与本响应中其他作品不重复。

排序固定为：

```text
reaction_count DESC
created_at DESC
后端内部主键 ASC，仅用于保证稳定顺序且不得返回
```

排序后取前 5 项。作者不足 5 个有效作品时返回实际数量，允许空数组。

`latest_work` 单独从全部公开作品中按 `created_at DESC` 选择，不得直接使用按反应数排序的
`works[0]`。

## 8. 书单与赛事分享契约

### 8.1 成功响应

```json
{
  "title": "夏夜角色卡收藏",
  "description": "整理的一组夏日角色卡",
  "author": {
    "display_name": "书单作者",
    "avatar_url": "https://cdn.discordapp.com/avatars/.../avatar.png"
  },
  "works": [
    {
      "title": "高反应作品一",
      "image_url": "https://cdn.discordapp.com/attachments/.../cover-1.png",
      "reaction_count": 320,
      "created_at": "2026-07-20T12:00:00Z"
    }
  ],
  "stats": {
    "item_count": 12,
    "collection_count": 3,
    "view_count": 120
  },
  "is_tournament": false,
  "created_at": "2026-07-01T12:00:00Z",
  "updated_at": "2026-08-08T13:00:00Z"
}
```

### 8.2 字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 是 | 书单或赛事标题 |
| `description` | string/null | 否 | 书单或赛事简介 |
| `author.display_name` | string | 是 | 书单创建者或赛事组织者显示名称，不返回用户 ID |
| `author.avatar_url` | string/null | 是 | 书单创建者或赛事组织者头像，不返回用户 ID |
| `works` | array | 是 | 代表作品，最多 5 项 |
| `works[].title` | string | 是 | 作品标题；不返回帖子 ID |
| `works[].image_url` | string | 是 | 作品封面 URL |
| `works[].reaction_count` | integer | 是 | 用于确认排序结果 |
| `works[].created_at` | ISO 8601 string | 是 | 用于同分排序 |
| `stats.item_count` | integer | 是 | 书单内全部可见帖子数 |
| `stats.collection_count` | integer/null | 否 | 书单收藏数 |
| `stats.view_count` | integer/null | 否 | 书单浏览数 |
| `is_tournament` | boolean | 是 | Function 据此选择书单或赛事文案 |
| `created_at` | ISO 8601 string | 是 | 书单创建时间 |
| `updated_at` | ISO 8601 string | 是 | 分享元数据最后更新时间 |

### 8.3 作品选择

书单和赛事不再按照 `default_sort_method` 选择 OG 代表作品。分享层固定使用：

```text
reaction_count DESC
created_at DESC
后端内部主键 ASC，仅用于保证稳定顺序且不得返回
```

只从当前书单中公开、未删除、允许分享且具有有效封面的作品中选择，去重后最多返回 5 项。

如果 `works` 为空，Function 使用站点默认 OG 图片。第一阶段不要求后端生成默认封面。

## 9. 状态码

| 状态码 | 含义 |
| --- | --- |
| `200` | 认证成功且资源允许分享 |
| `401` | 缺少或携带错误机器 Token |
| `404` | 不存在、私有、已删除、不可见或不允许分享 |
| `422` | 路径参数格式不合法 |
| `429` | 超出内部接口速率限制 |
| `500` | 后端内部错误 |
| `503` | 分享服务未配置或暂时不可用 |

错误响应不得包含 Token、数据库语句、内部异常栈或资源私密信息。Cloudflare Function 对除 `200`
以外的结果统一安全回退站点默认 OG。

## 10. 性能与缓存

- 一个分享请求只调用一个后端端点；
- 后端不得要求 Function 扇出请求业务接口；
- 单次响应最多包含 5 个作品对象；
- 建议正常请求在 2 秒内完成；
- Function 当前硬超时为 10 秒，后端不应接近该上限；
- 响应应保持紧凑，不返回完整业务模型；
- `updated_at` 必须稳定，不得简单填充当前请求时间；
- Reaction 等统计允许存在短时间缓存，不要求每次抓取绝对实时；
- 建议后端内部缓存 5 至 15 分钟，降低社交爬虫重复抓取成本。

如果未来生成合成图片，缓存键应至少包含：

```text
资源类型 + 请求路径资源标识 + updated_at + 图片模板版本
```

不得使用 `Date.now()` 或随机数作为 OG 图片版本。

## 11. 后端验收

以下示例中的路径 ID 只作为请求参数，成功响应中不得出现任何 Discord ID。

### 11.1 认证

```bash
curl -i https://后端域名/v1/internal/share-metadata/threads/RESOURCE_ID
```

预期：`401`。

```bash
curl -i \
  -H 'Authorization: Bearer <OG_SERVICE_TOKEN>' \
  https://后端域名/v1/internal/share-metadata/threads/RESOURCE_ID
```

预期：允许分享的帖子返回 `200` 和最小 DTO。

### 11.2 隐私

- [ ] 响应不包含任何 Discord 用户、服务器、频道、消息或帖子 ID；
- [ ] 私有资源与不存在资源均返回 `404`；
- [ ] 响应不包含完整正文、权限或管理字段；
- [ ] 日志不记录 Authorization Header 和完整签名 CDN URL。

### 11.3 帖子

- [ ] 最多返回一张主图；
- [ ] 返回反应、回复、收藏和创建时间；
- [ ] 无图片时 `image_url = null`；
- [ ] 作者对象只有显示名称和可选头像。

### 11.4 作者

- [ ] `works` 最多 5 项；
- [ ] 默认按 `reaction_count DESC` 排序；
- [ ] 同分时按 `created_at DESC`；
- [ ] `latest_work` 与热门作品独立选择；
- [ ] 统计只汇总公开作品；
- [ ] 作品对象不含帖子 ID。

### 11.5 书单与赛事

- [ ] `works` 最多 5 项；
- [ ] 只从书单内部作品选择；
- [ ] 默认按反应数排序，不受书单页面默认排序影响；
- [ ] 返回帖子数、收藏数、浏览数和创建时间；
- [ ] 赛事通过 `is_tournament` 区分；
- [ ] 作品对象不含帖子 ID。

## 12. 分阶段交付

建议后端按以下顺序提交：

1. 帖子分享接口：单图、统计与创建时间；
2. 作者分享接口：统计、最新作品和最多 5 个代表作品；
3. 扩展书单接口：从单图升级为最多 5 个代表作品；
4. 验证赛事继续复用书单接口；
5. 普通 OG 链路验收成功后，再实现合成图片与缓存。

第一阶段不要求：

- 后端生成 PNG/WebP；
- 开放匿名业务 API；
- 图片代理或 R2 持久化；
- 为每个资源创建公开分享 Token；
- 返回 Discord ID 供前端二次查询。
