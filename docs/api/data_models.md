# API 数据模型

本文件只保留当前前端需要理解的模型语义和类型边界。完整字段定义以 [`openapi.json`](../../openapi.json) 的 `components.schemas` 以及自动生成的 [`src/shared/types/openapi.d.ts`](../../src/shared/types/openapi.d.ts) 为准。

## 类型来源与 ID 约定

生成类型的命令是：

```bash
pnpm gen:api
```

前端领域类型直接复用生成 schema：

```ts
import type { components } from "@shared-types/openapi";

type ThreadDetail = components["schemas"]["ThreadDetail"];
type Booklist = components["schemas"]["BooklistDetail"];
```

Discord Snowflake 以及 API 响应中的主要 Discord ID 使用 `string`。请求 schema 为兼容后端，部分 ID 同时接受 `integer | string`；浏览器端仍应优先使用字符串，避免超过 `Number.MAX_SAFE_INTEGER`。

时间字段在生成类型中通常是 `string`，实际响应使用 ISO 8601 字符串。不要把它们文档化成 JavaScript `Date`，除非调用方自行转换。

## 通用分页

书单列表、书单项列表和赛事列表都使用同一结构：

```ts
interface PaginatedResponse<T> {
  total: number;
  limit: number;
  offset: number;
  results: T[];
}
```

这是前端 [`src/entities/booklist/types.ts`](../../src/entities/booklist/types.ts) 的本地泛型；OpenAPI 中对应三个具体 schema：`PaginatedResponse_BooklistSummary_`、`PaginatedResponse_BooklistDetail_`、`PaginatedResponse_BooklistItemDetail_`。

## 帖子与作者

### `ThreadDetail`

搜索、发现、单帖详情和书单项都围绕这个模型。必填字段是 `thread_id`、`channel_id`、`title`、`created_at`、`reaction_count`、`reply_count`、`thumbnail_urls`；响应还包含：

| 字段 | 类型 | 语义 |
| --- | --- | --- |
| `thread_id` / `guild_id` / `channel_id` | `string` | Discord ID |
| `author` | `AuthorDetail-Output` 或 `null` | 作者信息，可能为空 |
| `last_active_at` | `string` 或 `null` | 最后活跃时间 |
| `collection_count` | `number`，默认 `0` | 总收藏数 |
| `display_count` | `number`，默认 `0` | 搜索结果展示次数 |
| `first_message_excerpt` | `string` 或 `null` | 首楼摘要 |
| `thumbnail_urls` | `string[]` | 首楼图片 URL 列表；不是单数的 `thumbnail_url` |
| `tags` / `virtual_tags` | `string[]` | 真实标签 / 虚拟映射标签 |
| `collected_flag` | `boolean`，默认 `false` | 当前用户是否收藏 |
| `is_tournament` | `boolean`，默认 `false` | 是否属于赛事 |
| `tournament_info_list` | `TournamentInfo-Output[]` | 所属赛事列表 |

旧代码中可能出现的 `id`、`is_following`、`active_flag`、`has_update` 等字段不是 `ThreadDetail` 的生成 schema 字段。前端 [`src/entities/thread/types.ts`](../../src/entities/thread/types.ts) 的 `Thread` 为兼容 UI 的扩展类型，不能反向当成后端基础模型。

### `FollowedThreadResponse-Output`

它包含 `ThreadDetail` 的帖子字段，并额外提供关注关系字段：`latest_update_at`、`latest_update_link`、`followed_at`、`last_viewed_at`、`has_update`（默认 `false`）和 `active_flag`（默认 `true`）。`FollowsListResponse` 的 `threads` 数组使用该模型。

### 作者模型

`AuthorDetail-Output` 和 `AuthorProfileResponse` 的作者 ID 是字符串；作者信息字段为 `name`、`global_name: string | null`、`display_name`、`avatar_url: string | null`。`AuthorProfileResponse` 还包含 `stats: AuthorStats`，统计字段为 `thread_count`、`reaction_count`、`reply_count`，默认值为 `0`。

搜索建议使用独立的 `AuthorSuggestion-Output`（`id`、`name`、`display_name`、可选 `avatar_url`），不要用完整作者档案替代它。

## 搜索、发现与元数据

### `SearchRequest`

这是 `POST /v1/search/` 的请求模型。字段按用途分组如下：

| 分组 | 字段 |
| --- | --- |
| 范围 | `guild_id`、`channel_ids` |
| 标签/作者 | `include_tags`、`exclude_tags`、`tag_logic`、`include_authors`、`exclude_authors`、`author_name` |
| 关键词 | `keywords`、`exclude_keywords`、`exclude_keyword_exemption_markers` |
| 时间 | `created_after`、`created_before`、`active_after`、`active_before` |
| 数值过滤 | `reaction_count_range`、`reply_count_range` |
| 排序 | `sort_method`、`custom_base_sort`、`sort_order` |
| 分页/行为 | `limit`（1–100，默认 10）、`offset`（默认 0）、`exclude_thread_ids`、`exclude_channel_ids`、`search_by_collection`、`apply_preferences`、`debug_timing` |

默认值：`tag_logic="and"`、`search_by_collection=false`、`apply_preferences=false`、两个数值范围为 `[0, 10000000)`、`sort_method="comprehensive"`、`custom_base_sort="comprehensive"`、`sort_order="desc"`。

`keywords` 使用逗号表达 AND、斜杠表达 OR；日期字段接受 `YYYY-MM-DD` 或后端支持的相对时间格式（例如 `-7d`）。前端 UI 请求不是这个 schema 的一对一复制，实际转换见 [`searchApi.ts`](../../src/features/search/api/searchApi.ts)。

### `SearchResponse`、建议和相似帖

`SearchResponse` 必填字段只有 `total`、`limit`、`offset`、`results: ThreadDetail[]`；另有 `available_tags: string[]` 和 `virtual_tags: string[]`。它不包含 `unread_count` 或 `banner_carousel`。

`SearchSuggestionResponse` 包含作者、帖子和书单建议数组：`authors: AuthorSuggestion-Output[]`、`threads: ThreadSuggestion-Output[]`、`booklists: BooklistSuggestion[]`。后端描述每类最多 3 个。

`SimilarThreadsResponse` 必填 `source_thread_id`，另有 `matched_tag_count`（默认 0）和 `results: ThreadDetail[]`。

### 频道和标签

`ChannelDetail-Output` 的核心字段是 `guild_id`、`guild_name`、`channel_id`、`name`、`category_id`、`category_name`，以及：

- `available_tags: TagDetail-Output[]`：原生标签；`TagDetail-Output` 是 `tag_id` 和 `name`。
- `virtual_tags: VirtualTagDetail-Output[]`：每项为 `tag_name` 和 `source_channel_ids`。
- `mapped_source_channels: MappedSourceChannelDetail-Output[]`：虚拟标签来源频道及其标签。
- `real_thread_count`、`virtual_thread_count`、`total_thread_count`：均默认为 `0`。

`TagStatsRequest` 为 `guild_id`、`channel_ids`、`include_virtual`（默认 `true`）。`TagStatsResponse` 为 `total_threads` 和 `items: TagStatItem-Output[]`；每个 `TagStatItem` 有 `tag_name`、`total_thread_count`、`channel_info`。`ChannelTagInfo-Output` 除频道/标签 ID 和 `thread_count` 外，还包含 `guild_name`、`channel_name`、分类字段及 `is_virtual`。旧文档只列出 `channel_id/channel_name/tag_name`，是不完整的。

`DiscoveryRailsResponse` 固定包含 `latest`、`reaction_surge`、`discussion_surge`、`collection_surge` 四个 `ThreadDetail[]` 数组。

## 分享元数据模型

分享/OG 接口使用独立的 DTO，不复用完整帖子或书单详情：

- `ThreadShareMetadataDTO`：`title`、可空 `description` 和 `image_url`、`OpenGraphAuthorDTO author`、`ThreadShareStatsDTO stats`、`created_at`、`updated_at`。帖子统计是 `reaction_count`、`reply_count`、`collection_count`。
- `AuthorShareMetadataDTO`：`display_name`、可空 `avatar_url`、`AuthorShareStatsDTO stats`、可空 `latest_work`、最多五项 `OpenGraphWorkDTO-Output[] works`、`updated_at`。
- `BooklistShareMetadataDTO`：`title`、可空 `description`/`cover_image_url`/`author_name`、最多五项作品、`BooklistShareStatsDTO stats`、`is_tournament`、`created_at`、`updated_at`。
- `OpenGraphWorkDTO-Output`：`title`、`image_url`、`reaction_count`、`created_at`；`OpenGraphLatestWorkDTO-Output`：`title`、`created_at`。

`AuthorShareStatsDTO` 的字段是公开作品数、总反应数和总回复数；`BooklistShareStatsDTO` 的字段是 `item_count`、`collection_count`、`view_count`。这些 DTO 的字段应以生成 schema 为准，不能把普通 `ThreadDetail` 的 `thumbnail_urls` 等字段套进来。

## 关注响应

`FollowsListResponse` 的字段是：

```ts
{
  total: number;
  threads: components["schemas"]["FollowedThreadResponse-Output"][];
  limit: number;
  offset: number;
}
```

关注页所需的 `unread_count` 来自单独的 `GET /v1/follows/unread-count`。前端将两次请求组合后才得到 `FollowsResponse`；这不是 OpenAPI 生成模型。

## 偏好模型

`UserPreferencesResponse` 必填 `user_id`，其余字段包括：

`preferred_channels`、`include_authors`、`exclude_authors`、`include_tags`、`exclude_tags`、`include_keywords`（默认空字符串）、`exclude_keywords`（默认空字符串）、`exclude_keyword_exemption_markers`（默认 `["禁", "🈲"]`）、`preview_image_mode`（默认 `thumbnail`）、`results_per_page`（默认 `5`）、`ui_page_size`（默认 `48`）、`sort_method`（默认 `comprehensive`）、`custom_base_sort`（默认 `comprehensive`）以及四个可空时间字段。

`UserPreferencesUpdateRequest` 使用同名可空字段，全部可选；ID 列表在 schema 中接受数字或字符串。`preview_image_mode` 的约定值是 `thumbnail`、`full`、`none`。生成 schema 对 `results_per_page` 的描述要求小于 10；网页端独立的 `ui_page_size` 是另一项设置，不应混用。

## Banner 与图片刷新

### `BannerApplicationRequest` / `BannerItem-Output`

Banner 申请请求的三个必填字段是：

```ts
{
  thread_link: string;
  cover_image_url: string;
  target_scope: string;
}
```

`thread_link` 支持 Discord 完整链接或纯数字 ID。响应 `BannerApplicationResponse` 必填 `success`、`message`，`application_id` 可空。

`BannerItem-Output` 字段为 `thread_id`、`title`、`cover_image_url`、`channel_id`、`guild_id`、`target_type`（默认 `1`）、`start_time`、`end_time`。ID 是字符串；不存在 `link` 或 `image` 这类 OpenAPI 字段，页面需要自行组装 UI 数据。

### `FetchImageRequest` / `FetchImageResponse`

请求包含 `items: FetchImageItem[]`；每个 item 必须有 `thread_id`，`channel_id` 可选。结果每项包含 `thread_id`、`thumbnail_urls`、`updated`（默认 `false`）和可空的 `error`。

## 书单与赛事模型

### `BooklistDetail` 与 `BooklistSummary-Output`

两者字段基本一致。核心字段：

| 字段 | 类型/默认值 | 说明 |
| --- | --- | --- |
| `id` | `number` | 书单 ID |
| `owner_id` | `string` | 创建者 Discord 用户 ID |
| `title`、`description`、`cover_image_url` | 字符串/可空 | 书单元数据 |
| `author` | `AuthorDetail-Output` 或 `null` | 创建者信息 |
| `is_public`、`is_anonymous`、`is_default` | `boolean` | 可见性及默认书单标记 |
| `is_tournament` | `boolean = false` | 赛事是特殊书单 |
| `tournament_channel_id` | `string` 或 `null` | 赛事关联频道 |
| `default_sort_method` / `default_sort_order` | `join_time` / `desc` | 书单默认排序 |
| `item_count` / `collection_count` / `view_count` | `number` | 项目、收藏、浏览计数 |
| `publish_status` | `number = 0` | `0` 未发布、`1` 待处理、`2` 成功、`3` 失败 |
| `created_at` / `updated_at` | `string` | 时间 |
| `collected_flag` / `is_marked` | `boolean = false` | 当前用户收藏；请求 `mark_thread_id` 时的命中标记 |
| `publish_info` | `BooklistPublishInfo-Output` 或 `null` | 已发布时的 Discord 信息，仅详情模型有此字段 |

`BooklistSummary-Output` 用于列表，`BooklistDetail` 用于详情；不要把旧文档中的 `display_type` 作为当前排序模型，创建/更新接口仍接受它是因为后端标记为已废弃，优先使用 `default_sort_method` 与 `default_sort_order`。

### 书单项

`BooklistItemDetail` 必填 `booklist_item_id`、`thread_id`、`channel_id`、`title`、`author`、`created_at`、`reaction_count`、`reply_count`、`thumbnail_urls`、`display_order`、`added_at`，并包含帖子展示字段、`comment`、`tournament_participated_at`、`collected_flag` 等。`thumbnail_urls`、`tags`、`virtual_tags` 都是数组；不存在单数 `thumbnail_url`。

写入模型：

- `BooklistItemsAddRequest`：`{ items: BooklistItemAddData[] }`；每项必须有 `thread_id`，可选 `comment`、`display_order`、`tournament_participated_at`。
- `BooklistItemsDeleteRequest`：`{ thread_ids: (number | string)[] }`。
- `BooklistItemUpdateRequest`：可选/可空的 `comment`、`display_order`、`tournament_participated_at`。
- `BooklistItemsSyncRequest`：必须有 `thread_id`、`scope_booklist_ids`、`target_booklist_ids`，可选 `comment`；目标列表必须是 scope 的子集。
- `BooklistItemsSyncDTO`：`thread_id` 及新增、移除、未变化的书单 ID 数组。

发布模型 `BooklistPublishRequest` 只有必填的 `thread_url`；`BooklistPublishInfo-Output` 返回 Discord guild/thread/message 的字符串 ID、URL 和 `published_at`。

创建和更新响应分别是 `BooklistCreateResponse`（`booklist_id`、`title`、`created_at`）和 `BooklistUpdateResponse`（`booklist_id`、`title`，以及可选默认 message）。

赛事专用模型由独立 `/tournament/*` 路由使用：

- `TournamentCreateRequest`：必填 `tournament_channel_id`、`owner_id`、`title`；可选 `description`、`cover_image_url`、`is_public`（默认 `true`）。对应响应 `TournamentCreateResponse` 还返回 `booklist_id`、`tournament_channel_id`、`created` 和提示 `message`。
- `TournamentUpdateRequest`：可选/可空的 `title`、`description`、`cover_image_url`、`is_public`。
- `TournamentItemsAddRequest`：`items: TournamentItemAddData[]`；每项必须有 `thread_id`，可选 `comment` 和 `tournament_participated_at`。
- `TournamentItemUpdateRequest`：可选/可空的 `comment`、`tournament_participated_at`。

当前网页赛事功能使用 `BooklistDetail` 和 `/booklist/*`，而不是这些 API-key 路由。OpenAPI 还会为同一 Pydantic 模型生成 `*-Input`/`*-Output` 两个内部 schema；前端响应应使用 `*-Output`，不把 `*-Input` 当作网络响应类型。

## 收藏、简单响应和错误

收藏接口的 body 是 ID 数组，`target_type=1` 表示帖子、`target_type=2` 表示书单。这个约定与书单模型分离，不能写成 `CollectionRequest` 对象。

登录、登出、关注写操作、收藏写操作、发布/删除等多个接口在 OpenAPI 中的成功响应是未细化的 `object`，因此文档和前端都不应假定统一的 `{ success, message }` 结构。已细化的操作响应只使用各自 schema。

校验失败统一可能返回 `HTTPValidationError`：`detail` 是 `{ loc, msg, type }[]`。未知的业务错误字段不在当前生成契约中。

## 前端适配类型边界

以下类型是前端方便 UI 使用的适配，不是后端新增模型：

- `Thread`：基于 `ThreadDetail`，把 `tags` 和赛事字段扩展为 UI 可选字段，并保留少量旧字段兼容。
- `FollowedThread`：基于 `Thread` 加入关注关系字段。
- `Booklist` / `BooklistItem`：分别直接别名 `BooklistDetail` / `BooklistItemDetail`。
- `PaginatedResponse<T>`：前端泛型包装器。
- `FollowsResponse`：把 `/follows/` 和 `/follows/unread-count` 两次响应组合后的 UI 结构。
- `UserPreferencesResponse`：前端把三个 Snowflake 列表归一化为字符串数组。

新增字段或接口时，应先更新后端导出的 `openapi.json`，再重新生成类型；不要只修改本文件或手工扩大前端类型。
