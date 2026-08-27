# Odysseia Forum API 指南

本文档描述当前仓库配套的后端 API。路径、请求参数和响应模型以仓库根目录的 [`openapi.json`](../../openapi.json) 为准；TypeScript 类型由 [`src/shared/types/openapi.d.ts`](../../src/shared/types/openapi.d.ts) 自动生成。这里不复制完整 JSON Schema，避免与生成文件再次漂移。

## 基础地址与前端封装

OpenAPI 中的完整路径包含 `/v1`，例如 `GET /v1/search/thread/{thread_id}`。前端 [`src/shared/api/client.ts`](../../src/shared/api/client.ts) 的 `baseURL` 默认是 `http://localhost:10810/v1`，所以业务代码传入的是 `/search/thread/{thread_id}`；`VITE_API_URL` 可以覆盖这个默认值。

```bash
pnpm gen:api
```

该命令执行 `python3 scripts/export_openapi.py`，再用 `openapi-typescript openapi.json -o src/shared/types/openapi.d.ts` 更新契约。只有在后端导出内容确实变化时才应运行它，不要手工编辑生成的 `.d.ts`。

`apiClient` 当前行为：

- `withCredentials: true`，优先使用会话 Cookie。
- 检测到跨域 Cookie 不可用且前端已保存 token 时，才通过 `Authorization: Bearer <token>` 回退。
- 除 `/auth/checkauth` 外，响应为 `401` 会清除前端认证会话。
- 生产环境没有设置 `VITE_API_URL` 时会警告并回退到本地默认地址；这不是生产部署配置。

## 认证

OpenAPI 声明了两种安全方案：

| 名称 | 传输方式 | 用途 |
| --- | --- | --- |
| `HTTPBearer` | `Authorization: Bearer <token>` | 作者、偏好、搜索、关注、元数据、Banner、书单、收藏、标签、发现和图片刷新等用户接口 |
| `APIKeyHeader` | `X-API-Key: <key>` | `/v1/tournament/*` 管理接口 |

`/auth/*` 不声明 OpenAPI security requirement，但真实前端登录状态通过 Cookie 或上面的 Bearer 回退机制维持。登录页面在真实环境直接跳转到 `/v1/auth/login`；开发环境跳转到 `/v1/auth/login-dev`，跳转基址由 `VITE_BACKEND_URL` 提供（缺省为当前源码中的后端地址），不是 `VITE_API_URL`。`/auth/login` 和 `/auth/login-dev` 是浏览器跳转入口，不是业务代码应当解析 JSON 的普通接口。开发 Mock 中存在 `POST /auth/login` 的测试调用，它不属于当前 OpenAPI 生产路由。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/v1/auth/login` | Discord OAuth2 登录入口，重定向到 Discord |
| `GET` | `/v1/auth/callback?code=...` | OAuth2 回调 |
| `GET` | `/v1/auth/login-dev` | 开发用登录入口，回调到 `callback-dev` |
| `GET` | `/v1/auth/callback-dev?code=...` | 开发用回调，直接返回 token HTML |
| `GET` | `/v1/auth/logout` | 清除 session Cookie 并退出登录 |
| `GET` | `/v1/auth/checkauth` | 检查当前认证状态；前端读取 `loggedIn`、可选的 `user` 和 `unread_count` |

OpenAPI 没有为登录、登出、认证检查定义具体响应 schema，因此不要把具体 JSON 字段当成后端契约。前端自己的最小适配类型见 [`src/features/auth/api/authApi.ts`](../../src/features/auth/api/authApi.ts)。

## 用户内容 API

下面的表格列出当前 OpenAPI 中的全部用户内容接口。除特别标注外，均要求 `HTTPBearer`。

### 搜索、作者与元数据

| 方法 | 路径 | 请求/参数 | 响应 |
| --- | --- | --- | --- |
| `POST` | `/v1/search/` | JSON `SearchRequest` | `SearchResponse` |
| `GET` | `/v1/search/thread/{thread_id}` | 路径参数 `thread_id` | `ThreadDetail` |
| `GET` | `/v1/search/thread/{thread_id}/similar` | `limit`（默认 5） | `SimilarThreadsResponse` |
| `GET` | `/v1/search/suggestions` | 必填 `keyword`；`apply_preferences`（默认 `true`） | `SearchSuggestionResponse` |
| `GET` | `/v1/authors/{author_id}` | 路径参数 `author_id` | `AuthorProfileResponse` |
| `GET` | `/v1/meta/channels` | `channel_ids`、`guild_id` 可选 | `ChannelDetail[]` |
| `GET` | `/v1/meta/main-guild` | 无 | 未细化的 JSON 对象 |

搜索请求支持服务器/频道、真实标签和虚拟标签、作者 ID、关键词、时间范围、反应数/回复数范围、排序和分页。完整字段以 `components.schemas.SearchRequest` 为准。前端 [`src/features/search/api/searchApi.ts`](../../src/features/search/api/searchApi.ts) 还提供 UI 到 API 的映射：UI 的 `relevance` 等排序值会转换为后端 `comprehensive`、`last_active` 等值；作者名 token 会拼到 `keywords` 的 `author:"..."` 语法中。

无限滚动时，前端会把已展示的 `thread_id` 放到 `exclude_thread_ids`；需要去重时同时使用 `offset: 0`。这些是当前调用约定，不是额外的响应字段。

### 关注

| 方法 | 路径 | 请求/参数 | 响应 |
| --- | --- | --- | --- |
| `GET` | `/v1/follows/` | `limit` 默认 `10000`、`offset` 默认 `0`、`active_flag`、`channel_ids` | `FollowsListResponse` |
| `POST` | `/v1/follows/{thread_id}` | 路径参数 `thread_id` | 未细化的 JSON 对象 |
| `DELETE` | `/v1/follows/{thread_id}` | 路径参数 `thread_id` | 未细化的 JSON 对象 |
| `GET` | `/v1/follows/unread-count` | 无 | 未细化的 JSON 对象，前端读取 `unread_count` |
| `POST` | `/v1/follows/mark-viewed` | 无 | 未细化的 JSON 对象 |

后端原始列表字段是 `total`、`threads`、`limit`、`offset`。前端 [`followsApi.getFollows`](../../src/features/follows/api/followsApi.ts) 会再请求未读数量，并组合成 UI 使用的 `{ results, total, unread_count }`；不要把这个组合结构当成后端响应。

### 偏好

| 方法 | 路径 | 请求/参数 | 响应 |
| --- | --- | --- | --- |
| `GET` | `/v1/preferences/users/{user_id}` | 可选 query `guild_id`（前端传入） | `UserPreferencesResponse` |
| `PUT` | `/v1/preferences/users/{user_id}` | 可选 query `guild_id`；JSON `UserPreferencesUpdateRequest` | `UserPreferencesResponse` |

OpenAPI schema 将 `user_id` 及 ID 列表表达为整数/整数数组；前端为避免 Discord Snowflake 精度损失，会把 `preferred_channels`、`include_authors`、`exclude_authors` 作为字符串数组保存，并在请求发送前转换为后端可接受的表示。

### Banner、标签和图片

| 方法 | 路径 | 请求/参数 | 响应 |
| --- | --- | --- | --- |
| `POST` | `/v1/banner/apply` | JSON `BannerApplicationRequest` | `BannerApplicationResponse` |
| `GET` | `/v1/banner/active` | `channel_ids` 或兼容旧调用的 `channel_id` | `BannerItem[]` |
| `POST` | `/v1/tags/stats` | JSON `TagStatsRequest` | `TagStatsResponse` |
| `POST` | `/v1/fetch-images/` | JSON `FetchImageRequest` | `FetchImageResponse` |

Banner 申请的字段是 `thread_link`、`cover_image_url`、`target_scope`；`thread_link` 可以是 Discord 完整跳转链接或纯数字 ID。它不是 `thread_id` 字段。

图片刷新请求是 `{ "items": [{ "thread_id": "...", "channel_id": "..." }] }`。Snowflake 在浏览器中应使用字符串。

### 收藏

| 方法 | 路径 | query | JSON body |
| --- | --- | --- | --- |
| `POST` | `/v1/collection/batch/add` | `target_type`：`1` 帖子、`2` 书单，默认 `1` | **纯 ID 数组**，例如 `["123", "456"]` |
| `POST` | `/v1/collection/batch/remove` | 同上 | **纯 ID 数组** |

body 不是 `{ target_ids: [...] }`。当前书单 UI 通过 [`src/features/booklists/api/booklistsApi.ts`](../../src/features/booklists/api/booklistsApi.ts) 传递书单 ID 数组并设置 `target_type=2`。

## 书单 API

书单创建和更新的元数据使用 query 参数，不使用 JSON body。列表响应统一是 `total`、`limit`、`offset`、`results`。

| 方法 | 路径 | 关键参数/请求 | 响应 |
| --- | --- | --- | --- |
| `POST` | `/v1/booklist/save` | query `title` 必填；`description`、`cover_image_url`、`is_public`、`is_anonymous`、`display_type`、`default_sort_method`、`default_sort_order` 可选 | `BooklistCreateResponse` |
| `GET` | `/v1/booklist/list/page` | `owner_id`、`keywords`、`included_thread_id`、`is_tournament`、`search_by_collect`、排序、`limit`、`offset` | `PaginatedResponse[BooklistSummary]` |
| `GET` | `/v1/booklist/my/list/page` | `is_public`、`keywords`、`collect_by_current_user`、`create_by_current_user`、`mark_thread_id`、排序、分页 | `PaginatedResponse[BooklistSummary]` |
| `GET` | `/v1/booklist/detail/{booklist_id}` | 路径参数 | `BooklistDetail` |
| `PUT` | `/v1/booklist/update/{booklist_id}` | query 元数据字段；`display_type` 已废弃 | `BooklistUpdateResponse` |
| `DELETE` | `/v1/booklist/delete/{booklist_id}` | 路径参数 | 未细化的 JSON 对象 |
| `POST` | `/v1/booklist/publish/{booklist_id}` | JSON `BooklistPublishRequest` | 未细化的 JSON 对象 |
| `DELETE` | `/v1/booklist/publish/{booklist_id}` | 路径参数 | 未细化的 JSON 对象 |
| `GET` | `/v1/booklist/item/list/page/{booklist_id}` | `limit` 默认 `50`、`offset` 默认 `0`、可选排序 | `PaginatedResponse[BooklistItemDetail]` |
| `POST` | `/v1/booklist/item/add/{booklist_id}` | JSON `{ items: BooklistItemAddData[] }` | `BooklistItemAddResponse[]` |
| `DELETE` | `/v1/booklist/item/delete/{booklist_id}` | JSON `{ thread_ids: [...] }` | 未细化的 JSON 对象 |
| `PATCH` | `/v1/booklist/item/update/{booklist_id}/{thread_id}` | JSON `BooklistItemUpdateRequest` | `BooklistItemDetail` |
| `POST` | `/v1/booklist/item/sync` | JSON `BooklistItemsSyncRequest` | `BooklistItemsSyncDTO` |

当前前端的“赛事”不是另一套书单 API：[`useTournamentsData.ts`](../../src/features/tournaments/hooks/useTournamentsData.ts) 将赛事作为 `is_tournament=true` 的书单，复用上述 `/booklist/*` 路径。`default_sort_method` 支持 `hot`、`created_at`、`reaction_count`、`reply_count`、`collection_count`、`last_active_at`、`join_time`、`display_order`。

当前 [`booklistsApi.listItems`](../../src/features/booklists/api/booklistsApi.ts) 还会尝试传递 `exclude_thread_ids`，但该 query 参数没有出现在当前 OpenAPI 的 `/v1/booklist/item/list/page/{booklist_id}` 定义中；它不能作为后端契约依赖，若要正式支持应先更新后端 schema。

## 发现

| 方法 | 路径 | 参数 | 响应 |
| --- | --- | --- | --- |
| `GET` | `/v1/discovery/rails` | `limit` 默认 `10`、`days` 默认 `30`、`channel_ids`、`apply_preferences` 默认 `true` | `DiscoveryRailsResponse` |
| `GET` | `/v1/discovery/rails/{rail_name}` | `rail_name` 为 `latest`、`reaction_surge`、`discussion_surge`、`collection_surge`；另有 `limit`、`days`、`offset`、`channel_ids`、`apply_preferences` | `ThreadDetail[]` |
| `GET` | `/v1/discovery/random` | `limit` 默认 `10`、`channel_ids`、`exclude_channel_ids`、`include_tags`、`exclude_tags`、`tag_logic` 默认 `and` | `ThreadDetail[]` |

前端 [`discoveryApi.ts`](../../src/features/discovery/api/discoveryApi.ts) 同时使用聚合轨道、单轨道分页和随机接口；不能再把它们描述成仅由 `/search` 模拟的旧方案。

## 分享元数据接口

这些接口位于 `internal` 命名空间，由分享/OG 运行时读取。OpenAPI 没有给它们声明 `HTTPBearer` security requirement，但显式列出了可选的 `Authorization` header；是否发送由调用方决定。

| 方法 | 路径 | 响应 |
| --- | --- | --- |
| `GET` | `/v1/internal/share-metadata/threads/{thread_id}` | `ThreadShareMetadataDTO` |
| `GET` | `/v1/internal/share-metadata/authors/{author_id}` | `AuthorShareMetadataDTO` |
| `GET` | `/v1/internal/share-metadata/booklists/{booklist_id}` | `BooklistShareMetadataDTO` |

这三条接口不是普通前端 `apiClient` 业务调用；它们的动态 OG 使用方式见 [`docs/architecture/dynamic_open_graph.md`](../../docs/architecture/dynamic_open_graph.md)。

## 赛事管理 API（X-API-Key）

OpenAPI 仍导出了独立的 `/tournament/*` 路由，认证方式是 `X-API-Key`。当前 Web 前端没有调用这些路由；赛事页面使用上一节所述的书单接口。保留本节是为了完整记录生成的 API 契约。

| 方法 | 路径 | 请求/参数 | 响应 |
| --- | --- | --- | --- |
| `POST` | `/v1/tournament/create` | JSON `TournamentCreateRequest` | `TournamentCreateResponse` |
| `GET` | `/v1/tournament/list/page` | `tournament_channel_id`、排序、分页 | `PaginatedResponse[BooklistDetail]` |
| `GET` | `/v1/tournament/{tournament_channel_id}` | 路径参数 | `BooklistDetail` |
| `PATCH` | `/v1/tournament/{tournament_channel_id}` | JSON `TournamentUpdateRequest` | 未细化的 JSON 对象 |
| `DELETE` | `/v1/tournament/{tournament_channel_id}` | 路径参数 | 未细化的 JSON 对象 |
| `GET` | `/v1/tournament/{tournament_channel_id}/items` | `limit` 默认 `50`、`offset` 默认 `0` | `PaginatedResponse[BooklistItemDetail]` |
| `POST` | `/v1/tournament/{tournament_channel_id}/items/add` | JSON `TournamentItemsAddRequest` | 未细化的 JSON 对象 |
| `DELETE` | `/v1/tournament/{tournament_channel_id}/items/delete` | JSON `BooklistItemsDeleteRequest` | 未细化的 JSON 对象 |
| `PATCH` | `/v1/tournament/{tournament_channel_id}/items/{thread_id}` | JSON `TournamentItemUpdateRequest` | 未细化的 JSON 对象 |

## 服务与调试端点

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/` | API 根路径 |
| `GET` | `/v1/health` | 健康检查；后端描述为检查数据库和 Redis 连通性 |
| `GET` | `/v1/debug/memory` | 内存对象诊断 |
| `GET` | `/v1/debug/memory/sources` | 按模块汇总内存来源 |
| `GET` | `/v1/debug/memory/force-gc` | 强制 GC 并比较回收前后状态 |
| `GET` | `/v1/debug/memory/pools` | SQLAlchemy/Redis 连接池状态 |

调试端点未定义具体响应 schema，不应作为生产前端依赖。

## ID、时间和错误

Discord Snowflake 在前端必须作为字符串保存和发送：

```ts
const threadId = "1393246224072839168";
await apiClient.get(`/search/thread/${threadId}`);
```

OpenAPI 的响应模型已将主要 `thread_id`、`guild_id`、`channel_id`、作者 ID 等字段定义为字符串；部分请求模型仍接受整数或字符串，部分内部写入模型仍是整数。不要在浏览器中把 Snowflake 转成 JavaScript `number`。

请求校验失败时，OpenAPI 声明 `422 HTTPValidationError`。其 `detail` 是包含 `loc`、`msg`、`type` 的数组。具体业务错误状态和未细化的成功响应，以实际后端响应为准，不能从当前生成 schema 推断额外字段。
